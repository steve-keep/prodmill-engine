package internal

import (
	"io"
	"net/http"
	"strings"
	"testing"
)

// mockHTTPClient is a mock HTTP client for testing.
type mockHTTPClient struct {
	doFunc func(req *http.Request) (*http.Response, error)
}

func (m *mockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	return m.doFunc(req)
}

func TestCallJulesAPI(t *testing.T) {
	client := &JulesClient{
		apiKey: "test-api-key",
		httpClient: &mockHTTPClient{
			doFunc: func(req *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: 200,
					Body:       io.NopCloser(strings.NewReader(`{"status": "success"}`)),
				}, nil
			},
		},
	}

	payload := map[string]string{"prompt": "hello"}
	resp, err := client.CallJulesAPI(payload)
	if err != nil {
		t.Fatalf("CallJulesAPI failed: %v", err)
	}

	if status, ok := resp["status"].(string); !ok || status != "success" {
		t.Errorf("Expected status 'success', but got '%v'", resp["status"])
	}
}
