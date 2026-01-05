const core = require('@actions/core');
const fs = require('fs').promises;
const path = require('path');
const { exec: callbackExec, spawn } = require('child_process');
const { promisify } = require('util');
const exec = promisify(callbackExec);
const https = require('https');
const github = require('@actions/github');

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

"${specification}"

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

"${userPrinciples}"

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

async function run() {
  try {
    const mode = core.getInput('mode', { required: true });
    switch (mode) {
      case 'create-spec':
        await runCreateSpec();
        break;
      case 'update-constitution':
        await runUpdateConstitution();
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
