const core = require('@actions/core');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

async function run() {
  try {
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
    const sectionRegex = new RegExp(`(##.*${beadComment})\\n([\\s\\S]*?)(?=\\n##|$)`);
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


  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
