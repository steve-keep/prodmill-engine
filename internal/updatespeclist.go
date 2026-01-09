package internal

import (
	"fmt"
	"os"
	"os/exec"
	"reflect"
	"sort"

	"gopkg.in/yaml.v3"
)

const (
	specDir            = "./specs"
	createPlanTemplate = ".github/ISSUE_TEMPLATE/create-plan.yml"
	createTasksTemplate = ".github/ISSUE_TEMPLATE/create-tasks.yml"
)

// RunUpdateSpecList handles the logic for the 'update-spec-list' mode.
func RunUpdateSpecList() error {
	fmt.Println("Update spec list triggered!")

	dirs, err := getSpecDirectories(specDir)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Println("`specs` directory not found. Skipping update.")
			return nil
		}
		return fmt.Errorf("failed to get spec directories: %w", err)
	}

	if len(dirs) == 0 {
		fmt.Println("No spec directories found. Skipping update.")
		return nil
	}

	issueTemplatePaths := []string{createPlanTemplate, createTasksTemplate}
	var changedFiles []string

	for _, path := range issueTemplatePaths {
		changed, err := updateIssueTemplate(path, dirs)
		if err != nil {
			if os.IsNotExist(err) {
				fmt.Printf("Issue template file not found: %s. Skipping.\n", path)
				continue
			}
			return fmt.Errorf("failed to update issue template %s: %w", path, err)
		}
		if changed {
			changedFiles = append(changedFiles, path)
		}
	}

	if len(changedFiles) == 0 {
		fmt.Println("All issue templates are already up to date. No commit needed.")
		return nil
	}

	return commitAndPush(changedFiles)
}

func getSpecDirectories(dirPath string) ([]string, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var dirs []string
	for _, entry := range entries {
		if entry.IsDir() {
			dirs = append(dirs, entry.Name())
		}
	}
	return dirs, nil
}

func updateIssueTemplate(filePath string, dirs []string) (bool, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return false, err
	}

	var issueTemplate struct {
		Body []struct {
			ID         string `yaml:"id"`
			Type       string `yaml:"type"`
			Attributes struct {
				Options []string `yaml:"options"`
			} `yaml:"attributes"`
		} `yaml:"body"`
	}

	if err := yaml.Unmarshal(content, &issueTemplate); err != nil {
		return false, fmt.Errorf("failed to unmarshal YAML: %w", err)
	}

	var dropdown *struct {
		ID         string `yaml:"id"`
		Type       string `yaml:"type"`
		Attributes struct {
			Options []string `yaml:"options"`
		} `yaml:"attributes"`
	}

	for i := range issueTemplate.Body {
		if issueTemplate.Body[i].ID == "spec" {
			dropdown = &issueTemplate.Body[i]
			break
		}
	}

	if dropdown == nil {
		fmt.Printf("No 'spec' dropdown found in %s. Skipping.\n", filePath)
		return false, nil
	}

	currentOptions := dropdown.Attributes.Options
	sort.Strings(currentOptions)
	sort.Strings(dirs)

	if reflect.DeepEqual(currentOptions, dirs) {
		fmt.Printf("Issue template %s is already up to date. Skipping update for this file.\n", filePath)
		return false, nil
	}

	dropdown.Attributes.Options = dirs
	updatedContent, err := yaml.Marshal(&issueTemplate)
	if err != nil {
		return false, fmt.Errorf("failed to marshal YAML: %w", err)
	}

	if err := os.WriteFile(filePath, updatedContent, 0644); err != nil {
		return false, fmt.Errorf("failed to write updated issue template: %w", err)
	}

	fmt.Printf("Successfully updated %s.\n", filePath)
	return true, nil
}


func commitAndPush(files []string) error {
	if err := runCommand("git", "config", "--global", "--add", "safe.directory", "/github/workspace"); err != nil {
		return fmt.Errorf("git config safe.directory failed: %w", err)
	}
	if err := runCommand("git", "config", "--global", "user.name", "github-actions[bot]"); err != nil {
		return fmt.Errorf("git config user.name failed: %w", err)
	}
	if err := runCommand("git", "config", "--global", "user.email", "github-actions[bot]@users.noreply.github.com"); err != nil {
		return fmt.Errorf("git config user.email failed: %w", err)
	}
	gitAddArgs := append([]string{"add"}, files...)
	if err := runCommand("git", gitAddArgs...); err != nil {
		return fmt.Errorf("git add failed: %w", err)
	}
	if err := runCommand("git", "commit", "-m", "docs: update spec dropdown in issue templates [skip ci]"); err != nil {
		return fmt.Errorf("git commit failed: %w", err)
	}
	if err := runCommand("git", "push"); err != nil {
		return fmt.Errorf("git push failed: %w", err)
	}
	fmt.Println("Successfully updated the issue templates and pushed the changes.")
	return nil
}

var cmdExecutor = exec.Command

func runCommand(name string, args ...string) error {
	cmd := cmdExecutor(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
