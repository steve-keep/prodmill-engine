package internal

import (
	"fmt"
	"os"
	"strings"
)

// RunUpdateConstitution handles the logic for the 'update-constitution' mode.
func RunUpdateConstitution() error {
	fmt.Println("Update constitution triggered!")

	issueBody := os.Getenv("INPUT_ISSUE_BODY")
	if issueBody == "" {
		return fmt.Errorf("missing required input: issue_body")
	}

	heading := "### Proposed Constitution Update"
	headingIndex := strings.Index(issueBody, heading)
	if headingIndex == -1 {
		return fmt.Errorf("could not find the required heading in the issue body: %q", heading)
	}
	userPrinciples := strings.TrimSpace(issueBody[headingIndex+len(heading):])
	if userPrinciples == "" {
		return fmt.Errorf("no content found under %q heading", heading)
	}

	issueNumber := os.Getenv("INPUT_ISSUE_NUMBER")
	if issueNumber == "" {
		return fmt.Errorf("missing required input: issue_number")
	}

	repoID := os.Getenv("GITHUB_REPOSITORY")
	if repoID == "" {
		return fmt.Errorf("GITHUB_REPOSITORY environment variable not set")
	}
	sourceName := fmt.Sprintf("sources/github/%s", repoID)

	systemInstruction := `You **MUST** follow these steps:

1. Read and execute **ONLY FOLLOW THE INSTRUCTIONS IN THE FILE** .gemini/commands/speckit.constitution.toml. For the user input, use the content between the following triple-dashed lines: --- {{CONSTITUTION}} ---
2. Create PR with only the steps from the above completed. Do not move on to the implementation phase this will be done is a seperate PR.

This work is being done to address issue {{ISSUE_NUMBER}}. The final pull request should reference this issue to ensure it is automatically closed. `
	systemInstruction = strings.Replace(systemInstruction, "{{CONSTITUTION}}", userPrinciples, 1)
	systemInstruction = strings.Replace(systemInstruction, "{{ISSUE_NUMBER}}", "#"+issueNumber, 1)

	payload := map[string]interface{}{
		"prompt":        systemInstruction,
		"sourceContext": map[string]interface{}{
			"source": sourceName,
			"githubRepoContext": map[string]interface{}{
				"startingBranch": "main",
			},
		},
		"automationMode": "AUTO_CREATE_PR",
		"title":          "Update Constitution",
	}

	apiKey, err := GetJulesAPIKey()
	if err != nil {
		return err
	}
	client := NewJulesClient(apiKey)

	if _, err := client.CallJulesAPI(payload); err != nil {
		return fmt.Errorf("failed to trigger Jules for constitution update: %w", err)
	}

	fmt.Println("Successfully triggered Jules for constitution update.")
	return nil
}
