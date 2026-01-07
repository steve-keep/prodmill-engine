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

      - name: Run Prod-Mill Engine
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'create-spec'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
          issue_number: ${{ github.event.issue.number }}
```

### Required Secrets

The `create-spec` workflow requires the following secret to be configured in your repository:

- `JULES_API_KEY`: Your API key for the Jules service, which is used for specification generation.

These secrets can be added in the "Secrets and variables" > "Actions" section of your repository's settings.

## `create-plan` Workflow

The `create-plan` workflow is triggered when an issue is labeled with `create-plan`. It uses ProdMill to generate a detailed implementation plan based on a selected specification.

### Triggering the Workflow

To trigger this workflow, create an issue using the "Create Plan" issue form. This form will apply the `create-plan` label, which triggers the workflow. The form requires you to select an existing specification and provide details for the implementation plan.

### Workflow Configuration

To use the `create-plan` workflow, you need to create a file named `create-plan.yml` in the `.github/workflows/` directory of your repository with the following content:

```yaml
name: Create Plan

on:
  issues:
    types: [labeled]

jobs:
  create-plan:
    if: github.event.label.name == 'create-plan'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Run Prod-Mill Engine
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'create-plan'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
          issue_number: ${{ github.event.issue.number }}
```

### Issue Template

The workflow relies on a specific issue template to gather the necessary information. The `update-spec-list` workflow (see below) can automatically populate a dropdown in this template with the names of the spec directories found in the `./specs` folder.

Create a file named `create-plan.yml` in the `.github/ISSUE_TEMPLATE/` directory with the following content:

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

### Required Secrets

The `create-plan` workflow requires the following secret to be configured in your repository:

- `JULES_API_KEY`: Your API key for the Jules service, which is used for plan generation.

## `create-tasks` Workflow

The `create-tasks` workflow is triggered when an issue is labeled with `create-tasks`. It uses ProdMill to break down a specification into discrete development tasks.

### Triggering the Workflow

To trigger this workflow, create an issue using the "Create Tasks" issue form. This form will apply the `create-tasks` label, which triggers the workflow. The form requires you to select an existing specification.

### Workflow Configuration

To use the `create-tasks` workflow, you need to create a file named `create-tasks.yml` in the `.github/workflows/` directory of your repository with the following content:

```yaml
name: Create Tasks

on:
  issues:
    types: [labeled]

jobs:
  create-tasks:
    if: github.event.label.name == 'create-tasks'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Prod-Mill Engine
        uses: steve-keep/prodmill-engine@main
        with:
          mode: 'create-tasks'
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
          issue_number: ${{ github.event.issue.number }}
```

### Issue Template

The workflow relies on a specific issue template to gather the necessary information. The `update-spec-list` workflow (see below) can automatically populate a dropdown in this template with the names of the spec directories found in the `./specs` folder.

Create a file named `create-tasks.yml` in the `.github/ISSUE_TEMPLATE/` directory with the following content:

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

### Required Secrets

The `create-tasks` workflow requires the following secret to be configured in your repository:

- `JULES_API_KEY`: Your API key for the Jules service, which is used for task generation.

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
        uses: actions/checkout@v3

      - name: Update spec list in issue templates
        uses: steve-keep/prodmill-engine@main
        with:
          mode: update-spec-list
```

### Required Secrets

This workflow uses the default `GITHUB_TOKEN` to commit changes. No additional secrets are required.

## `update-constitution` Workflow

The `update-constitution` workflow is triggered when a new issue is created with the "Update Constitution" issue form. It uses ProdMill to update the constitution.

### Triggering the Workflow

To trigger the `update-constitution` workflow, you need to create a new issue using the "Update Constitution" issue form. This form will automatically apply the `update-constitution` label to the issue.

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
          jules_api_key: ${{ secrets.JULES_API_KEY }}
          issue_body: ${{ github.event.issue.body }}
          issue_number: ${{ github.event.issue.number }}
```

### Required Secrets

The `update-constitution` workflow requires the following secret to be configured in your repository:

- `JULES_API_KEY`: Your API key for the Jules service.

## `next-task` Workflow (Disabled)

The `next-task` workflow is currently disabled and does not perform any actions.
