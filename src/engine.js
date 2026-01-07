const core = require('@actions/core');
const fs = require('fs').promises;
const path = require('path');
const { exec: callbackExec, spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(callbackExec);
const https = require('https');
const github = require('@actions/github');
const yaml = require('js-yaml');

async function runUpdateSpecList() {
    console.log('Update spec list triggered!');
    const specDir = './specs';
    const issueTemplatePaths = [
        '.github/ISSUE_TEMPLATE/create-plan.yml',
        '.github/ISSUE_TEMPLATE/create-tasks.yml',
    ];

    try {
        const files = await fs.readdir(specDir);
        const dirs = [];
        for (const file of files) {
            const stat = await fs.stat(path.join(specDir, file));
            if (stat.isDirectory()) {
                dirs.push(file);
            }
        }

        if (dirs.length === 0) {
            console.log('No spec directories found. Skipping update.');
            return;
        }

        const changedFiles = [];

        for (const issueTemplatePath of issueTemplatePaths) {
            try {
                const issueTemplate = await fs.readFile(issueTemplatePath, 'utf8');
                const issueTemplateJson = yaml.load(issueTemplate);

                const dropdown = issueTemplateJson.body.find(field => field.id === 'spec');
                if (!dropdown) {
                    console.log(`No 'spec' dropdown found in ${issueTemplatePath}. Skipping.`);
                    continue;
                }

                const currentOptions = dropdown.attributes.options;
                const sortedCurrentOptions = [...currentOptions].sort();
                const sortedDirs = [...dirs].sort();

                if (JSON.stringify(sortedCurrentOptions) !== JSON.stringify(sortedDirs)) {
                    dropdown.attributes.options = dirs;
                    const updatedIssueTemplate = yaml.dump(issueTemplateJson);
                    await fs.writeFile(issueTemplatePath, updatedIssueTemplate, 'utf8');
                    console.log(`Successfully updated ${issueTemplatePath}.`);
                    changedFiles.push(issueTemplatePath);
                } else {
                    console.log(`Issue template ${issueTemplatePath} is already up to date. Skipping update for this file.`);
                }
            } catch (error) {
                 if (error.code === 'ENOENT') {
                    console.log(`Issue template file not found: ${issueTemplatePath}. Skipping.`);
                 } else {
                    throw error;
                 }
            }
        }

        if (changedFiles.length === 0) {
            console.log('All issue templates are already up to date. No commit needed.');
            return;
        }

        await exec('git config --global user.name "github-actions[bot]"');
        await exec('git config --global user.email "github-actions[bot]@users.noreply.github.com"');

        const filesToAdd = changedFiles.join(' ');
        await exec(`git add ${filesToAdd}`);

        await exec('git commit -m "docs: update spec dropdown in issue templates [skip ci]"');
        await exec('git push');

        console.log('Successfully updated the issue templates and pushed the changes.');

    } catch (error) {
        if (error.code === 'ENOENT' && error.path === specDir) {
            console.log('`specs` directory not found. Skipping update.');
            return;
        }
        core.setFailed(error.message);
    }
}

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

  const specRegex = /### Product Specification\s*([\s\S]*)/;
  const specMatch = issueBody.match(specRegex);

  const specification = specMatch ? specMatch[1].trim() : '';

  if (!specification) {
    core.setFailed('Could not find a Product Specification in the issue body.');
    return;
  }

  const issueNumber = github.context.issue.number;
  if (!issueNumber) {
      core.setFailed('Could not determine the issue number from the GitHub context.');
      return;
  }

  const specifyCommandFile = '.gemini/commands/speckit.specify.toml';
  const system_instruction = `read and execute the instructions in the file ${specifyCommandFile} using the following as the spec:

---
${specification}
---

DO NOT IMPLEMENT THE FEATURE. ONLY FOLLOW THE INSTRUCTIONS IN THE FILE ${specifyCommandFile}.

This work is being done to address issue #${issueNumber}. The final pull request should reference this issue to ensure it is automatically closed.`;

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
    "automationMode": "AUTO_CREATE_PR",
    title: "Create Specification"
  };

  try {
    await callJulesApi(payload);
    console.log('Successfully triggered Jules for spec creation.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function runUpdateConstitution() {
  console.log('Update constitution triggered!');
  const issueBody = core.getInput('issue_body', { required: true });

  const heading = '### Proposed Constitution Update';
  const headingIndex = issueBody.indexOf(heading);

  if (headingIndex === -1) {
    core.setFailed(`Could not find the required heading in the issue body: "${heading}"`);
    return;
  }

  const userPrinciples = issueBody.substring(headingIndex + heading.length).trim();

  if (!userPrinciples) {
    core.setFailed('No content found under "### Proposed Constitution Update" heading.');
    return;
  }

  const issueNumber = github.context.issue.number;
  if (!issueNumber) {
      core.setFailed('Could not determine the issue number from the GitHub context.');
      return;
  }

  const system_instruction = `read and execute the instructions in the file .gemini/commands/speckit.constitution.toml using the following core principles:

---
${userPrinciples}
---

This work is being done to address issue #${issueNumber}. The final pull request should reference this issue to ensure it is automatically closed.`;

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
    "automationMode": "AUTO_CREATE_PR",
    title: "Update Constitution"
  };

  try {
    await callJulesApi(payload);
    console.log('Successfully triggered Jules for constitution update.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function runNextTask() {
  console.log('Next-task functionality is currently disabled.');
}

async function runCreatePlan() {
  console.log('Create plan triggered!');
  const issueBody = core.getInput('issue_body', { required: true });

  const specNameRegex = /### Select Spec\s*\n\s*([\s\S]*?)\n\n/;
  const planDetailsRegex = /### Execute the implementation planning workflow using the plan template to generate design artifacts.\s*\n\s*([\s\S]*)/;

  const specNameMatch = issueBody.match(specNameRegex);
  const planDetailsMatch = issueBody.match(planDetailsRegex);

  const specName = specNameMatch ? specNameMatch[1].trim() : '';
  const planDetails = planDetailsMatch ? planDetailsMatch[1].trim() : '';

  if (!specName) {
    core.setFailed('Could not find a Spec Name in the issue body.');
    return;
  }

  if (!planDetails) {
    core.setFailed('Could not find Plan Details in the issue body.');
    return;
  }

  const issueNumber = github.context.issue.number;
  if (!issueNumber) {
      core.setFailed('Could not determine the issue number from the GitHub context.');
      return;
  }

  const system_instruction = `You **MUST** follow these steps:

1. Set the value of an environment variable named \`SPECIFY_FEATURE\`. The value for this variable is the content between the following triple-dashed lines:
---
${specName}
---
2. Read and execute ONLY FOLLOW THE INSTRUCTIONS IN THE FILE .gemini/commands/speckit.plan.toml. For the user input, use the content between the following triple-dashed lines:
---
${planDetails}
---
3. Create PR with only the steps from the above completed. Do not move on to the implementation phase this will be done is a seperate PR.

This work is being done to address issue ${issueNumber}. The final pull request should reference this issue to ensure it is automatically closed.`;

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
    "automationMode": "AUTO_CREATE_PR",
    title: "Create Plan for " + specName,
  };

  try {
    await callJulesApi(payload);
    console.log('Successfully triggered Jules for plan creation.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function runCreateTasks() {
  console.log('Create tasks triggered!');
  const issueBody = core.getInput('issue_body', { required: true });
  const issueNumber = core.getInput('issue_number', { required: true });

  const specNameRegex = /### Select Spec\s*\n\s*([\s\S]*?)\n\n/;
  const specNameMatch = issueBody.match(specNameRegex);
  const specName = specNameMatch ? specNameMatch[1].trim() : '';

  if (!specName) {
    core.setFailed('Could not find a Spec Name in the issue body.');
    return;
  }

  if (!issueNumber) {
      core.setFailed('Could not get issue number.');
      return;
  }

  const system_instruction = `You **MUST** follow these steps:

1. Set the value of an environment variable named \`SPECIFY_FEATURE\`. The value for this variable is the content between the following triple-dashed lines:
---
${specName}
---
2. Read and execute ONLY FOLLOW THE INSTRUCTIONS IN THE FILE .gemini/commands/speckit.tasks.toml
3. Create PR with only the steps from the above completed. Do not move on to the implementation phase this will be done is a seperate PR.

This work is being done to address issue ${issueNumber}. The final pull request should reference this issue to ensure it is automatically closed.`;

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
    "automationMode": "AUTO_CREATE_PR",
    title: "Create Tasks for " + specName,
  };

  try {
    await callJulesApi(payload);
    console.log('Successfully triggered Jules for task creation.');
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
      case 'create-plan':
        await runCreatePlan();
        break;
      case 'create-tasks':
        await runCreateTasks();
        break;
      case 'update-constitution':
        await runUpdateConstitution();
        break;
      case 'next-task':
        await runNextTask();
        break;
      case 'update-spec-list':
        await runUpdateSpecList();
        break;
      default:
        core.setFailed(`Invalid mode: ${mode}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

module.exports = {
  runUpdateSpecList,
  callJulesApi,
  runCreateSpec,
  runUpdateConstitution,
  runNextTask,
  runCreatePlan,
  runCreateTasks,
  run
};
