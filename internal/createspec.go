package internal

import (
	"fmt"
	"os"
	"regexp"
)

// RunCreateSpec handles the logic for the 'create-spec' mode.
func RunCreateSpec() error {
	fmt.Println("Create spec triggered!")

	issueBody := os.Getenv("INPUT_ISSUE_BODY")
	if issueBody == "" {
		return fmt.Errorf("missing required input: issue_body")
	}

	specRegex := regexp.MustCompile(`(?s)### Product Specification\s*(.*)`)
	specMatch := specRegex.FindStringSubmatch(issueBody)
	if len(specMatch) < 2 {
		return fmt.Errorf("could not find a Product Specification in the issue body")
	}
	specification := specMatch[1]

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

1. Read and execute **ONLY FOLLOW THE INSTRUCTIONS IN THE FILE** .gemini/commands/speckit.specify.toml. For the user input, use the content between the following triple-dashed lines: --- %s ---
2. Create PR with only the steps from the above completed. Do not move on to the implementation phase this will be done is a seperate PR.

This work is being done to address issue #%s. The final pull request should reference this issue to ensure it is automatically closed.`,
		specification,
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
		"title":          "Create Specification",
	}

	apiKey, err := GetJulesAPIKey()
	if err != nil {
		return err
	}
	client := NewJulesClient(apiKey)

	if _, err := client.CallJulesAPI(payload); err != nil {
		return fmt.Errorf("failed to trigger Jules for spec creation: %w", err)
	}

	fmt.Println("Successfully triggered Jules for spec creation.")
	return nil
}
