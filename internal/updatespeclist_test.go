package internal

import (
	"os"
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

// Note: Testing commitAndPush directly is complex as it involves mocking git.
// For this environment, we'll rely on the integration tests provided by the GitHub Action workflow.
