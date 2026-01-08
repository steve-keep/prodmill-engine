# ProdMill Integration

This document outlines the steps to integrate ProdMill into your repository.

## Consolidated ProdMill Workflow

The ProdMill engine is designed to be run from a single, consolidated GitHub Actions workflow. The workflow is triggered when an issue is opened or labeled, and it uses the issue's labels to determine which mode to run.

### Triggering the Workflow

To trigger the workflow, you need to create an issue using one of the following issue forms:

-   **Create Spec:** This form will automatically apply the `create-spec` label to the issue, which is required for the workflow to run.
-   **Create Plan:** This form will automatically apply the `create-plan` label to the issue, which is required for the workflow to run.
-   **Create Tasks:** This form will automatically apply the `create-tasks` label to the issue, which is required for the workflow to run.
-   **Update Constitution:** This form will automatically apply the `update-constitution` label to the issue, which is required for the workflow to run.

### Workflow Configuration

To use the consolidated workflow, you need to create a file named `prodmill.yml` in the `.github/workflows/` directory of your repository with the following content:

```yaml
name: ProdMill

on:
  issues:
    types: [opened, labeled]

jobs:
  create-spec:
    if: (github.event.action == 'opened' && contains(github.event.issue.labels.*.name, 'create-spec')) || (github.event.action == 'labeled' && github.event.label.name == 'create-spec')
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run ProdMill Engine
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'create-spec'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
          issue_number: ${{ github.event.issue.number }}

  create-plan:
    if: (github.event.action == 'opened' && contains(github.event.issue.labels.*.name, 'create-plan')) || (github.event.action == 'labeled' && github.event.label.name == 'create-plan')
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run ProdMill Engine
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'create-plan'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
          issue_number: ${{ github.event.issue.number }}

  create-tasks:
    if: (github.event.action == 'opened' && contains(github.event.issue.labels.*.name, 'create-tasks')) || (github.event.action == 'labeled' && github.event.label.name == 'create-tasks')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run ProdMill Engine
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'create-tasks'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
          issue_number: ${{ github.event.issue.number }}

  update-constitution:
    if: (github.event.action == 'opened' && contains(github.event.issue.labels.*.name, 'update-constitution')) || (github.event.action == 'labeled' && github.event.label.name == 'update-constitution')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run ProdMill Engine
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'update-constitution'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
          issue_number: ${{ github.event.issue.number }}
```

### Issue Templates

The workflow relies on specific issue templates to gather the necessary information. You will need to create the following files in your `.github/ISSUE_TEMPLATE/` directory:

#### `.github/ISSUE_TEMPLATE/create-spec.yml`

```yaml
name: Create Spec
description: Create a new specification for Prod-Mill.
title: "[Create Spec]: "
labels: ["create-spec"]
body:
  - type: textarea
    id: spec
    attributes:
      label: Product Requirements & Goals
      description: "Provide a detailed specification of the product's requirements and goals."
      placeholder: "### Product Specification\n\n..."
    validations:
      required: true
```

#### `.github/ISSUE_TEMPLATE/create-plan.yml`

```yaml
name: Create Plan
description: Create a new plan for a spec.
title: "[PLAN] "
labels: ["create-plan"]
body:
  - type: dropdown
    id: spec
    attributes:
      label: Select Spec
      description: Which spec do you want to create a plan for?
      options:
        - placeholder
    validations:
      required: true
  - type: textarea
    id: plan
    attributes:
      label: Execute the implementation planning workflow using the plan template to generate design artifacts.
      description: Provide the plan details here.
    validations:
      required: true
```

#### `.github/ISSUE_TEMPLATE/create-tasks.yml`

```yaml
name: Create Tasks
description: Create new tasks for a spec.
title: "[TASKS] "
labels: ["create-tasks"]
body:
  - type: dropdown
    id: spec
    attributes:
      label: Select Spec
      description: Which spec do you want to create tasks for?
      options:
        - placeholder
    validations:
      required: true
```

#### `.github/ISSUE_TEMPLATE/update-constitution.yml`

```yaml
name: Update Constitution
description: "Propose an update to the project's constitution.md."
title: "[Constitution]: "
labels: ["update-constitution"]
body:
  - type: textarea
    id: constitution-update
    attributes:
      label: Proposed Constitution Update
      description: "Describe the proposed changes or additions to the constitution."
      placeholder: "e.g., Add a new principle about..."
    validations:
      required: true
```

### Required Secrets

The consolidated workflow requires the following secret to be configured in your repository:

-   `JULES_API_KEY`: Your API key for the Jules service.

## `update-spec-list` Workflow

The `update-spec-list` workflow is triggered on pushes to the `main` branch. It automatically updates the `create-plan.yml` and `create-tasks.yml` issue templates' dropdown menus with the latest list of directories from the `./specs` folder. This ensures the "Create Plan" and "Create Tasks" issue forms always show the most current list of specifications.

### Triggering the Workflow

This workflow is automatically triggered when a push is made to the `main` branch.

### Workflow Configuration

To use the `update-spec-list` workflow, you need to create a file named `update-spec-list.yml` in the `.github/workflows/` directory of your repository with the following content:

```yaml
name: Update Spec List

on:
  push:
    branches:
      - main

jobs:
  update:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Update spec list in issue templates
        uses: steve-keep/prodmill-engine@main
        with:
          mode: update-spec-list
```

### Required Secrets

This workflow uses the default `GITHUB_TOKEN` to commit changes. No additional secrets are required.

## `next-task` Workflow (Disabled)

The `next-task` workflow is currently disabled and does not perform any actions.
