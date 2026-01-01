const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

async function runCreateSpec() {
  console.log('Create spec triggered!');
  const issue = github.context.payload.issue;
  if (!issue) {
    core.setFailed('Could not find issue in context.');
    return;
  }

  const issueBody = issue.body || '';

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

  const payload = {
    system_instruction: system_instruction
  };

  // For now, we'll just print the payload.
  // In the future, this would be sent to the Jules API.
  console.log('--- Jules API Payload ---');
  console.log(JSON.stringify(payload, null, 2));
  console.log('-------------------------');
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
  const payload = {
    task: task,
    plan_context: planContext,
    constitution: constitution,
    system_instruction: "You are working on a ProdMill project. Refer to the provided Spec-Kit for instructions. When finished, you must commit your changes and ensure the Bead is updated."
  };

  // For now, we'll just print the payload.
  // In the future, this would be sent to the Jules API.
  console.log(JSON.stringify(payload, null, 2));

  // 6. Output
  core.setOutput('issue_id', issueId);
  console.log(`Processing issue: ${issueId}`);
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
      default:
        core.setFailed(`Invalid mode: ${mode}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
