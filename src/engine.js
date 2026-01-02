const core = require('@actions/core');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

async function callJulesApi(payload) {
  const apiKey = core.getInput('jules_api_key', { required: true });
  const data = JSON.stringify(payload);

  const apiHostname = 'jules.googleapis.com';
  const apiPath = `/v1alpha/sessions`;

  const options = {
    hostname: apiHostname,
    port: 443,
    path: apiPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'X-Goog-Api-Key': apiKey
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('Jules API call successful.');
          resolve(responseBody ? JSON.parse(responseBody) : {});
        } else {
          reject(new Error(`Jules API call failed with status code ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Failed to make Jules API call: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}


async function runCreateSpec() {
  console.log('Create spec triggered!');
  const issueBody = core.getInput('issue_body', { required: true });

  const specRegex = /### Product Specification\s*([\s\S]*?)(?:### Technical Plan|$)/;
  const planRegex = /### Technical Plan\s*([\s\S]*)/;

  const specMatch = issueBody.match(specRegex);
  const planMatch = issueBody.match(planRegex);

  const specification = specMatch ? specMatch[1].trim() : '';
  const plan = planMatch ? planMatch[1].trim() : '';

  if (!specification) {
    core.setFailed('Could not find a Product Specification in the issue body.');
    return;
  }

  let system_instruction;
  if (plan) {
    system_instruction = `I have a new project request.
Specification provided by human:
${specification}

Plan provided by human:
${plan}

Your task:

Expand the Specification into a full .spec-kit/specification.md.
Convert the Plan into a detailed .spec-kit/plan.md with specific implementation phases.
Create a series of beads create commands. Each Bead must map back to a specific phase in your plan. Ensure dependencies are correctly set (e.g., 'API Setup' must block 'UI Integration').`;
  } else {
    system_instruction = `I have a new project request.
Specification provided by human:
${specification}

The human did not provide a technical plan.

Your task:

Based on the specification, draft a proposed high-level technical plan.
This plan should be suitable for a .spec-kit/plan.md file.
Submit this plan as a Pull Request for human review. Do not create beads or other files yet.`;
  }

  const repoId = process.env.GITHUB_REPOSITORY;
  if (!repoId) {
    core.setFailed('GITHUB_REPOSITORY environment variable not set.');
    return;
  }
  const sourceName = `sources/github/${repoId}`;

  const payload = {
    prompt: system_instruction,
    sourceContext: {
      source: sourceName,
      githubRepoContext: {
        startingBranch: "main"
      }
    },
    title: "Create Specification"
  };

  try {
    await callJulesApi(payload);
    console.log('Successfully triggered Jules for spec creation.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function runNextTask() {
  // 1. Workspace Discovery
  const workspace = process.env.PRODMILL_WORKSPACE || process.cwd();
  console.log(`Using workspace: ${workspace}`);

  const specKitPath = path.join(workspace, '.spec-kit');
  const beadsPath = path.join(workspace, '.beads');

  try {
    await fs.access(specKitPath);
    await fs.access(beadsPath);
  } catch (error) {
    core.setFailed('Missing .spec-kit or .beads directory.');
    return;
  }

  // 2. Beads Integration
  const bdReadyOutput = await new Promise((resolve, reject) => {
    exec('bd ready --json', { cwd: workspace }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to run "bd ready": ${stderr}`));
      }
      resolve(stdout);
    });
  });

  const tasks = bdReadyOutput.trim().split('\n').map(line => JSON.parse(line));
  if (tasks.length === 0) {
    console.log('No ready tasks found in beads.');
    return;
  }

  const task = tasks[0]; // Highest priority
  const issueId = task.id;

  // 3. plan.md Parsing
  const planPath = path.join(specKitPath, 'plan.md');
  const planContent = await fs.readFile(planPath, 'utf8');
  const beadComment = `<!-- bead:${issueId} -->`;
  const sectionRegex = new RegExp(`(##.*${beadComment})\\n([\\s\S]*?)(?=\\n##|$)`);
  const match = planContent.match(sectionRegex);

  if (!match) {
    core.setFailed(`Could not find a section for bead ${issueId} in plan.md.`);
    return;
  }

  const planContext = match[2].trim();

  // 4. Constitution Reading
  const constitutionPath = path.join(specKitPath, 'constitution.md');
  const constitution = await fs.readFile(constitutionPath, 'utf8');

  // 5. Agent Payload Construction
  const repoId = process.env.GITHUB_REPOSITORY;
  if (!repoId) {
    core.setFailed('GITHUB_REPOSITORY environment variable not set.');
    return;
  }
  const sourceName = `sources/github/${repoId}`;

  const prompt = `You are working on a ProdMill project. Refer to the provided Spec-Kit for instructions. When finished, you must commit your changes and ensure the Bead is updated.

## Task Details
\`\`\`json
${JSON.stringify(task, null, 2)}
\`\`\`

## Plan Context
${planContext}

## Constitution
${constitution}
`;

  const payload = {
    prompt: prompt,
    sourceContext: {
      source: sourceName,
      githubRepoContext: {
        startingBranch: "main"
      }
    },
    title: `Next Task: ${task.title || issueId}`
  };

  try {
    await callJulesApi(payload);
    console.log(`Successfully triggered Jules for task ${issueId}.`);
  } catch (error) {
    core.setFailed(error.message);
  }

  // 6. Output
  core.setOutput('issue_id', issueId);
  console.log(`Processing issue: ${issueId}`);
}

async function runUpdateConstitution() {
  console.log('Update constitution triggered!');
  const issueBody = core.getInput('issue_body', { required: true });

  const contentRegex = /### Proposed Constitution Update\s*([\s\S]*)/;
  const match = issueBody.match(contentRegex);
  const constitutionUpdate = match ? match[1].trim() : '';

  if (!constitutionUpdate) {
    core.setFailed('Could not find a Proposed Constitution Update in the issue body.');
    return;
  }

  const system_instruction = `Run the setup.sh script and then run the command:

"/speckit.constitution ${constitutionUpdate}"`;

  const repoId = process.env.GITHUB_REPOSITORY;
  if (!repoId) {
    core.setFailed('GITHUB_REPOSITORY environment variable not set.');
    return;
  }
  const sourceName = `sources/github/${repoId}`;

  const payload = {
    prompt: system_instruction,
    sourceContext: {
      source: sourceName,
      githubRepoContext: {
        startingBranch: "main"
      }
    },
    title: "Update Constitution"
  };

  try {
    await callJulesApi(payload);
    console.log('Successfully triggered Jules for constitution update.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function run() {
  try {
    const mode = core.getInput('mode', { required: true });
    switch (mode) {
      case 'create-spec':
        await runCreateSpec();
        break;
      case 'next-task':
        await runNextTask();
        break;
      case 'update-constitution':
        await runUpdateConstitution();
        break;
      default:
        core.setFailed(`Invalid mode: ${mode}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
