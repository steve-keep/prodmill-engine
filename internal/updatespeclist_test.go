package internal

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// TestGetSpecDirectories tests the getSpecDirectories function.
func TestGetSpecDirectories(t *testing.T) {
	// Create a temporary directory structure for testing.
	tmpDir, err := os.MkdirTemp("", "specs")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create subdirectories and a file.
	os.Mkdir(filepath.Join(tmpDir, "spec1"), 0755)
	os.Mkdir(filepath.Join(tmpDir, "spec2"), 0755)
	os.WriteFile(filepath.Join(tmpDir, "file.txt"), []byte("hello"), 0644)

	dirs, err := getSpecDirectories(tmpDir)
	if err != nil {
		t.Fatalf("getSpecDirectories failed: %v", err)
	}

	expected := []string{"spec1", "spec2"}
	if len(dirs) != len(expected) {
		t.Errorf("Expected %d directories, but got %d", len(expected), len(dirs))
	}
}

// TestUpdateIssueTemplate tests the updateIssueTemplate function.
func TestUpdateIssueTemplate(t *testing.T) {
	// Create a temporary issue template file.
	tmpFile, err := os.CreateTemp("", "issue-template-*.yml")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	templateContent := `
name: Create Plan
body:
  - type: dropdown
    id: spec
    attributes:
      label: Select Spec
      options:
        - old-spec
`
	if _, err := tmpFile.WriteString(templateContent); err != nil {
		t.Fatalf("Failed to write to temp file: %v", err)
	}
	tmpFile.Close()

	dirs := []string{"new-spec1", "new-spec2"}
	changed, err := updateIssueTemplate(tmpFile.Name(), dirs)
	if err != nil {
		t.Fatalf("updateIssueTemplate failed: %v", err)
	}

	if !changed {
		t.Errorf("Expected the issue template to be changed, but it wasn't.")
	}

	// You could add more assertions here to check the file content.
}

// TestCommitAndPushCommands tests that the correct git commands are called.
func TestCommitAndPushCommands(t *testing.T) {
	var commands [][]string
	// Mock the command executor to capture the commands instead of running them.
	cmdExecutor = func(name string, args ...string) *exec.Cmd {
		commands = append(commands, append([]string{name}, args...))
		// Return a dummy command that does nothing.
		return exec.Command("true")
	}
	// Restore the original executor after the test.
	defer func() { cmdExecutor = exec.Command }()

	filesToCommit := []string{"file1.txt", "file2.txt"}
	err := commitAndPush(filesToCommit)
	if err != nil {
		t.Fatalf("commitAndPush failed: %v", err)
	}

	expectedCommands := [][]string{
		{"git", "config", "--global", "--add", "safe.directory", "/github/workspace"},
		{"git", "config", "--global", "user.name", "github-actions[bot]"},
		{"git", "config", "--global", "user.email", "github-actions[bot]@users.noreply.github.com"},
		{"git", "add", "file1.txt", "file2.txt"},
		{"git", "commit", "-m", "docs: update spec dropdown in issue templates [skip ci]"},
		{"git", "push"},
	}

	if len(commands) != len(expectedCommands) {
		t.Fatalf("Expected %d commands, but got %d. Commands: %v", len(expectedCommands), len(commands), commands)
	}

	for i, expected := range expectedCommands {
		if !equalSlices(commands[i], expected) {
			t.Errorf("Command %d: Expected %v, but got %v", i, expected, commands[i])
		}
	}
}

func equalSlices(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
