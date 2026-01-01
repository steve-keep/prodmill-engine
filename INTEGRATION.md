# Prod-Mill Engine Integration

This document outlines the steps to integrate the Prod-Mill Engine into your repository.

## `create-spec` Workflow

The `create-spec` workflow is triggered when a new issue is created in your repository. It uses the Prod-Mill Engine to create a new specification based on the issue's content.

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

      - name: Run Prod-Mill Engine
        uses: <your-github-username>/<your-repo-name>@main
        with:
          mode: 'create-spec'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Required Secrets

The `create-spec` workflow requires the following secrets to be configured in your repository:

- `JULES_API_KEY`: Your API key for the Jules service.
- `GITHUB_TOKEN`: A GitHub token with the necessary permissions to read and write to your repository.

These secrets can be added in the "Secrets and variables" > "Actions" section of your repository's settings.

## `next-task` Workflow

The `next-task` workflow is triggered when a pull request is opened or synchronized. It uses the Prod-Mill Engine to determine the next task to be worked on.

### Triggering the Workflow

To trigger the `next-task` workflow, you need to create a pull request. The workflow will run automatically when the pull request is opened or when new commits are pushed to it.

### Workflow Configuration

To use the `next-task` workflow, you need to create a file named `next-task.yml` in the `.github/workflows/` directory of your repository with the following content:

```yaml
name: Next Task

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  next-task:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Run Prod-Mill Engine
        uses: <your-github-username>/<your-repo-name>@main
        with:
          mode: 'next-task'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Required Secrets

The `next-task` workflow requires the same secrets as the `create-spec` workflow:

- `JULES_API_KEY`: Your API key for the Jules service.
- `GITHUB_TOKEN`: A GitHub token with the necessary permissions to read and write to your repository.

These secrets can be added in the "Secrets and variables" > "Actions" section of your repository's settings.
