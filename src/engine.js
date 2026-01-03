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
Convert the Plan into a detailed .spec-kit/plan.md with specific implementation phases.`;
  } else {
    system_instruction = `I have a new project request.
Specification provided by human:
${specification}

The human did not provide a technical plan.

Your task:

Based on the specification, draft a proposed high-level technical plan.
This plan should be suitable for a .spec-kit/plan.md file.
Submit this plan as a Pull Request for human review.`;
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
  console.log('Next-task functionality is currently disabled.');
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
