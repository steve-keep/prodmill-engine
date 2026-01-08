# Prod-Mill Engine

The `prodmill-engine` is a GitHub Action that serves as the core logic for the Prod-Mill workflow. It is a Go-based application that provides six modes of operation to automate various software development tasks.

## How it Works

The engine is designed to be run as a GitHub Action. Its behavior is determined by the `mode` input, which can be one of the following:

-   `create-spec`: Parses a GitHub issue to create a new product specification.
-   `create-plan`: Generates a detailed implementation plan from a specification.
-   `create-tasks`: Breaks down a specification into discrete development tasks.
-   `update-constitution`: Updates a project's constitution file based on an issue.
-   `update-spec-list`: Keeps issue templates up-to-date with the latest project specs.
-   `next-task`: (Currently disabled) Intended to determine the next task to work on.

## Usage

The Prod-Mill engine is designed to be run from a consolidated GitHub Actions workflow. The workflow is triggered when an issue is opened or labeled, and it uses the issue's labels to determine which mode to run.

For detailed integration instructions and the full workflow file, please refer to the `INTEGRATION.md` file.

The `update-spec-list` and `next-task` workflows are run separately.

### `update-spec-list`

This mode keeps issue templates up-to-date with the latest project specs.

```yaml
- name: Run Prod-Mill Engine
  uses: steve-keep/prodmill-engine@main
  with:
    mode: 'update-spec-list'
```

### `next-task` (Disabled)

This mode is currently disabled.

## Inputs

*   `mode` (required): The operation mode. One of `"create-spec"`, `"create-plan"`, `"create-tasks"`, `"update-constitution"`, `"update-spec-list"`, or `"next-task"`.
*   `jules_api_key` (required): The API key for the Jules AI agent.
*   `issue_body` (optional): The body of the issue that triggered the workflow.
*   `issue_number` (optional): The number of the issue that triggered the workflow. Required for "create-spec", "create-plan", "create-tasks", and "update-constitution" modes.

### Outputs

*   `issue_id`: The ID of the issue being processed.

## Local Development

To run the `prodmill-engine` locally, you will need to have Go installed. You can then run the application from the root of the repository:

```bash
export INPUT_MODE="<your_mode>"
export INPUT_JULES_API_KEY="<your_api_key>"
export INPUT_ISSUE_BODY="<your_issue_body>"
export INPUT_ISSUE_NUMBER="<your_issue_number>"
export GITHUB_REPOSITORY="<owner>/<repo>"
export GITHUB_REF_NAME="<ref>"

go run .
```

You can also build and run the binary directly:

```bash
go build -o prodmill-engine .
./prodmill-engine
```
