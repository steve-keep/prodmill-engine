# Prod-Mill Engine

The `prodmill-engine` is a GitHub Action that serves as the core logic for the Prod-Mill workflow. It bridges the gap between a project's task graph (managed by `beads`) and its technical specifications (managed by `spec-kit`). The engine identifies the highest-priority task, gathers the necessary context, and constructs a payload for an AI agent to execute.

## How it Works

The engine is designed to be run in the context of a project repository that utilizes both `beads` and `spec-kit`. It performs the following steps:

1.  **Workspace Discovery:** The engine first identifies the workspace, which is the root of the project repository. It looks for a `PRODMILL_WORKSPACE` environment variable, and if not found, defaults to the current working directory. It then verifies the existence of the `.spec-kit/` and `.beads/` directories.

2.  **Task Identification:** The engine uses the `beads` CLI to identify the highest-priority task that is ready for execution. It runs the `bd ready --json` command and selects the first task from the output.

3.  **Context Extraction:** Once a task is identified, the engine reads the `.spec-kit/plan.md` file to find the technical context for that task. The link between a bead and the plan is established through a custom HTML comment in the `plan.md` file:

    ```markdown
    ## Feature: User Authentication <!-- bead:{bead_id} -->
    ```

4.  **Constitution Reading:** The engine reads the `.spec-kit/constitution.md` file, which contains the "Guardrail Rules" for the project.

5.  **Payload Construction:** Finally, the engine constructs a JSON payload that includes the task, the extracted plan context, the constitution, and a system instruction for the AI agent.

## Usage

The `prodmill-engine` has two modes of operation: `create-spec` and `next-task`. For detailed integration instructions, please refer to the `INTEGRATION.md` file.

### `create-spec`

This mode is used to create a new specification from a GitHub issue.

```yaml
- name: Run ProdMill
  uses: steve-keep/prodmill-engine@main
  with:
    mode: 'create-spec'
    jules_api_key: ${{ secrets.JULES_API_KEY }}
    issue_body: ${{ github.event.issue.body }}
```

### `next-task`

This mode is used to determine the next task to work on.

```yaml
- name: Run ProdMill
  uses: steve-keep/prodmill-engine@main
  with:
    mode: 'next-task'
    jules_api_key: ${{ secrets.JULES_API_KEY }}
```

### Inputs

*   `mode` (required): The operation mode. Either `"create-spec"` or `"next-task"`.
*   `jules_api_key` (required): The API key for the Jules AI agent.
*   `issue_body` (optional): The body of the issue that triggered the workflow. Required for `create-spec` mode.

### Outputs

*   `issue_id`: The ID of the bead that is being processed.

## Local Development

To run the `prodmill-engine` locally, you will need to have Node.js and the `beads` CLI installed. You can then run the `engine.js` script directly:

```bash
PRODMILL_WORKSPACE=/path/to/your/project node src/engine.js
```

Make sure to set the `PRODMILL_WORKSPACE` environment variable to the root of a project that contains a `.spec-kit/` and `.beads/` directory.
