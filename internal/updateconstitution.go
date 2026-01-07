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

	systemInstruction := fmt.Sprintf(
		`read and execute the instructions in the file .gemini/commands/speckit.constitution.toml using the following core principles:

---
%s
---

This work is being done to address issue #%s. The final pull request should reference this issue to ensure it is automatically closed.`,
		userPrinciples,
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
