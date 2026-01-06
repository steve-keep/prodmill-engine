# Prod-Mill Engine

The `prodmill-engine` is a GitHub Action that serves as the core logic for the Prod-Mill workflow. It uses `spec-kit` to manage technical specifications. The engine identifies the highest-priority task, gathers the necessary context, and constructs a payload for an AI agent to execute.

## How it Works

The engine is designed to be run in the context of a project repository that utilizes `spec-kit`. It performs the following steps:

1.  **Workspace Discovery:** The engine first identifies the workspace, which is the root of the project repository. It looks for a `PRODMILL_WORKSPACE` environment variable, and if not found, defaults to the current working directory. It then verifies the existence of the `.spec-kit/` directory.

2.  **Task Identification:** The engine identifies the highest-priority task that is ready for execution from the `spec-kit` plan.

3.  **Context Extraction:** Once a task is identified, the engine reads the `.spec-kit/plan.md` file to find the technical context for that task.

4.  **Constitution Reading:** The engine reads the `.spec-kit/constitution.md` file, which contains the "Guardrail Rules" for the project.

5.  **Payload Construction:** Finally, the engine constructs a JSON payload that includes the task, the extracted plan context, the constitution, and a system instruction for the AI agent.

## Usage

The `prodmill-engine` has five modes of operation: `create-spec`, `create-plan`, `update-constitution`, `update-spec-list`, and `next-task`. For detailed integration instructions, please refer to the `INTEGRATION.md` file.

### `create-spec`

This mode is used to create a new specification from a GitHub issue. When an issue is opened, this action parses the "Product Specification" section and passes it to the AI to generate the necessary spec files.

```yaml
- name: Run Prod-Mill Engine
  uses: steve-keep/prodmill-engine@main
  with:
    mode: 'create-spec'
    jules_api_key: ${{ secrets.JULES_API_KEY }}
    issue_body: ${{ github.event.issue.body }}
```

### `create-plan`

This mode is triggered when an issue is labeled with `create-plan`. It instructs the AI to generate a detailed implementation plan based on the specification and plan details provided in the issue.

```yaml
- name: Run Prod-Mill Engine
  uses: steve-keep/prodmill-engine@main
  with:
    mode: 'create-plan'
    jules_api_key: ${{ secrets.JULES_API_KEY }}
    issue_body: ${{ github.event.issue.body }}
```

### `update-constitution`

This mode is triggered when an issue is opened with the `update-constitution` label. It takes the "Proposed Constitution Update" from the issue body and asks the AI to update the project's constitution file.

```yaml
- name: Run Prod-Mill Engine
  uses: steve-keep/prodmill-engine@main
  with:
    mode: 'update-constitution'
    jules_api_key: ${{ secrets.JULES_API_KEY }}
    issue_body: ${{ github.event.issue.body }}
```

### `update-spec-list`

This mode runs on a schedule or on push to the `main` branch. It scans the `./specs` directory and updates the dropdown list in the `create-plan` issue template to ensure it always shows the latest available specifications.

```yaml
- name: Run Prod-Mill Engine
  uses: steve-keep/prodmill-engine@main
  with:
    mode: 'update-spec-list'
```

### `next-task` (Disabled)

This mode was intended to determine the next task to work on, but it is currently disabled.

## Inputs

*   `mode` (required): The operation mode. One of `"create-spec"`, `"create-plan"`, `"update-constitution"`, `"update-spec-list"`, or `"next-task"`.
*   `jules_api_key` (required): The API key for the Jules AI agent. Required for modes that call the AI (`create-spec`, `create-plan`, `update-constitution`).
*   `issue_body` (optional): The body of the issue that triggered the workflow. Required for `create-spec`, `create-plan`, and `update-constitution` modes.

### Outputs

*   `issue_id`: The ID of the issue that is being processed.

## Local Development

To run the `prodmill-engine` locally, you will need to have Node.js installed. You can then run the `engine.js` script directly:

```bash
PRODMILL_WORKSPACE=/path/to/your/project node src/engine.js
```

Make sure to set the `PRODMILL_WORKSPACE` environment variable to the root of a project that contains a `.spec-kit/` directory.
