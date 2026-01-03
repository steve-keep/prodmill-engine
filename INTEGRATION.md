# ProdMill Integration

This document outlines the steps to integrate ProdMill into your repository.

## `create-spec` Workflow

The `create-spec` workflow is triggered when a new issue is created in your repository. It uses ProdMill to create a new specification based on the issue's content by calling an external AI service.

### Triggering the Workflow

To trigger the `create-spec` workflow, you need to create a new issue using the "Create Spec" issue form. This form will automatically apply the `create-spec` label to the issue, which is required for the workflow to run.

The issue form has the following fields:

- **Product Requirements & Goals:** A detailed specification of the product's requirements and goals. This field corresponds to the `### Product Specification` section in the issue body.
- **High-Level Technical Approach & Architecture:** An outline of the high-level technical approach and architecture for the project. This field corresponds to the `### Technical Plan` section in the issue body.
- **Tech Stack:** The primary tech stack for the project.

### Workflow Configuration

To use the `create-spec` workflow, you need to create a file named `create-spec.yml` in the `.github/workflows/` directory of your repository with the following content:

```yaml
name: Create Spec

on:
  issues:
    types: [opened]

jobs:
  create-spec:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Run ProdMill
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'create-spec'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
```

### Required Secrets

The `create-spec` workflow requires the following secret to be configured in your repository:

- `JULES_API_KEY`: Your API key for the Jules service, which is used for specification generation.

These secrets can be added in the "Secrets and variables" > "Actions" section of your repository's settings.

## `update-constitution` Workflow

The `update-constitution` workflow is triggered when a new issue is created with the "Update Constitution" issue form. It uses ProdMill to update the constitution.

### Triggering the Workflow

To trigger the `update-constitution` workflow, you need to create a new issue using the "Update Constitution" issue form. This form will automatically apply the `update-constitution` label to the issue, which is required for the workflow to run.

The issue form has the following fields:

- **Proposed Constitution Update:** A description of the proposed changes or additions to the constitution.

### Workflow Configuration

To use the `update-constitution` workflow, you need to create a file named `update-constitution.yml` in the `.github/workflows/` directory of your repository with the following content:

```yaml
name: Update Constitution

on:
  issues:
    types: [opened]

jobs:
  update-constitution:
    if: contains(github.event.issue.labels.*.name, 'update-constitution')
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Run ProdMill
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'update-constitution'
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Required Secrets

The `update-constitution` workflow requires the following secrets to be configured in your repository:

- `GEMINI_API_KEY`: Your API key for the Gemini service.
- `GITHUB_TOKEN`: This is a built-in secret provided by GitHub. You don't need to create it. However, you do need to ensure the workflow has the correct permissions. You can do this by adding the following to your `update-constitution.yml` file:
  ```yaml
  permissions:
    contents: write
    pull-requests: write
  ```

These secrets can be added in the "Secrets and variables" > "Actions" section of your repository's settings.

## `next-task` Workflow

The `next-task` workflow is triggered when a pull request is merged. It is currently a placeholder and does not perform any actions.

### Triggering the Workflow

To trigger the `next-task` workflow, you need to merge a pull request. The workflow will run automatically when the pull request is merged.

### Workflow Configuration

To use the `next-task` workflow, you need to create a file named `next-task.yml` in the `.github/workflows/` directory of your repository with the following content:

```yaml
name: Next Task

on:
  pull_request:
    types: [closed]

jobs:
  next-task:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Run ProdMill
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'next-task'
```
