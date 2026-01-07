package internal

import (
	"fmt"
	"os"
	"regexp"
)

// RunCreatePlan handles the logic for the 'create-plan' mode.
func RunCreatePlan() error {
	fmt.Println("Create plan triggered!")

	issueBody := os.Getenv("INPUT_ISSUE_BODY")
	if issueBody == "" {
		return fmt.Errorf("missing required input: issue_body")
	}

	specNameRegex := regexp.MustCompile(`(?s)### Select Spec\s*\n\s*(.*?)\n\n`)
	specNameMatch := specNameRegex.FindStringSubmatch(issueBody)
	if len(specNameMatch) < 2 {
		return fmt.Errorf("could not find a Spec Name in the issue body")
	}
	specName := specNameMatch[1]

	planDetailsRegex := regexp.MustCompile(`(?s)### Execute the implementation planning workflow using the plan template to generate design artifacts.\s*\n\s*(.*)`)
	planDetailsMatch := planDetailsRegex.FindStringSubmatch(issueBody)
	if len(planDetailsMatch) < 2 {
		return fmt.Errorf("could not find Plan Details in the issue body")
	}
	planDetails := planDetailsMatch[1]

	issueNumber := os.Getenv("INPUT_ISSUE_NUMBER")
	if issueNumber == "" {
		return fmt.Errorf("missing required input: issue_number")
	}

	repoID := os.Getenv("GITHUB_REPOSITORY")
	if repoID == "" {
		return fmt.Errorf("GITHUB_REPOSITORY environment variable not set")
	}
	sourceName := fmt.Sprintf("sources/github/%s", repoID)

	systemInstruction := fmt.Sprintf(
		`You **MUST** follow these steps:

1. Set the value of an environment variable named \`+"`SPECIFY_FEATURE`"+`. The value for this variable is the content between the following triple-dashed lines:
---
%s
---
2. Read and execute ONLY FOLLOW THE INSTRUCTIONS IN THE FILE .gemini/commands/speckit.plan.toml. For the user input, use the content between the following triple-dashed lines:
---
%s
---
3. Create PR with only the steps from the above completed. Do not move on to the implementation phase this will be done is a seperate PR.

This work is being done to address issue %s. The final pull request should reference this issue to ensure it is automatically closed.`,
		specName,
		planDetails,
		issueNumber,
	)

	payload := map[string]interface{}{
		"prompt":        systemInstruction,
		"sourceContext": map[string]interface{}{
			"source": sourceName,
			"githubRepoContext": map[string]interface{}{
				"startingBranch": "main",
			},
		},
		"automationMode": "AUTO_CREATE_PR",
		"title":          "Create Plan for " + specName,
	}

	apiKey, err := GetJulesAPIKey()
	if err != nil {
		return err
	}
	client := NewJulesClient(apiKey)

	if _, err := client.CallJulesAPI(payload); err != nil {
		return fmt.Errorf("failed to trigger Jules for plan creation: %w", err)
	}

	fmt.Println("Successfully triggered Jules for plan creation.")
	return nil
}
