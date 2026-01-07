package internal

import (
	"os"
	"testing"
)

// TestRunCreateSpec_NoIssueBody tests that RunCreateSpec returns an error when the issue body is missing.
func TestRunCreateSpec_NoIssueBody(t *testing.T) {
	os.Setenv("INPUT_ISSUE_BODY", "")
	err := RunCreateSpec()
	if err == nil {
		t.Error("Expected an error when running with no issue body, but got nil")
	}
}

// TestRunCreatePlan_NoIssueBody tests that RunCreatePlan returns an error when the issue body is missing.
func TestRunCreatePlan_NoIssueBody(t *testing.T) {
	os.Setenv("INPUT_ISSUE_BODY", "")
	err := RunCreatePlan()
	if err == nil {
		t.Error("Expected an error when running with no issue body, but got nil")
	}
}

// TestRunCreateTasks_NoIssueBody tests that RunCreateTasks returns an error when the issue body is missing.
func TestRunCreateTasks_NoIssueBody(t *testing.T) {
	os.Setenv("INPUT_ISSUE_BODY", "")
	os.Setenv("INPUT_ISSUE_NUMBER", "123")
	err := RunCreateTasks()
	if err == nil {
		t.Error("Expected an error when running with no issue body, but got nil")
	}
}

// TestRunCreateTasks_NoIssueNumber tests that RunCreateTasks returns an error when the issue number is missing.
func TestRunCreateTasks_NoIssueNumber(t *testing.T) {
	os.Setenv("INPUT_ISSUE_BODY", "### Select Spec\n\nspec-name")
	os.Setenv("INPUT_ISSUE_NUMBER", "")
	err := RunCreateTasks()
	if err == nil {
		t.Error("Expected an error when running with no issue number, but got nil")
	}
}

// TestRunUpdateConstitution_NoIssueBody tests that RunUpdateConstitution returns an error when the issue body is missing.
func TestRunUpdateConstitution_NoIssueBody(t *testing.T) {
	os.Setenv("INPUT_ISSUE_BODY", "")
	err := RunUpdateConstitution()
	if err == nil {
		t.Error("Expected an error when running with no issue body, but got nil")
	}
}

// TestRunNextTask tests that RunNextTask runs without error.
func TestRunNextTask(t *testing.T) {
	err := RunNextTask()
	if err != nil {
		t.Errorf("Expected RunNextTask to run without error, but got: %v", err)
	}
}
