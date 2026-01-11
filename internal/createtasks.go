package internal

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

// RunCreateTasks handles the logic for the 'create-tasks' mode.
func RunCreateTasks() error {
	fmt.Println("Create tasks triggered!")

	issueBody := os.Getenv("INPUT_ISSUE_BODY")
	if issueBody == "" {
		return fmt.Errorf("missing required input: issue_body")
	}
	issueNumber := os.Getenv("INPUT_ISSUE_NUMBER")
	if issueNumber == "" {
		return fmt.Errorf("missing required input: issue_number")
	}

	specNameRegex := regexp.MustCompile(`### Select Spec\s*\n\s*(.*)`)
	specNameMatch := specNameRegex.FindStringSubmatch(issueBody)
	if len(specNameMatch) < 2 {
		return fmt.Errorf("could not find a Spec Name in the issue body")
	}
	specName := strings.TrimSpace(specNameMatch[1])

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
2. Read and execute ONLY FOLLOW THE INSTRUCTIONS IN THE FILE .gemini/commands/speckit.tasks.toml
3. Create PR with only the steps from the above completed. Do not move on to the implementation phase this will be done is a seperate PR.

This work is being done to address issue #%s. The final pull request should reference this issue to ensure it is automatically closed.`,
		specName,
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
		"title":          "Create Tasks for " + specName,
	}

	apiKey, err := GetJulesAPIKey()
	if err != nil {
		return err
	}
	client := NewJulesClient(apiKey)

	if _, err := client.CallJulesAPI(payload); err != nil {
		return fmt.Errorf("failed to trigger Jules for task creation: %w", err)
	}

	fmt.Println("Successfully triggered Jules for task creation.")
	return nil
}
