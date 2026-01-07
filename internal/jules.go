package internal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

const (
	julesAPIHostname = "jules.googleapis.com"
	julesAPIPath     = "/v1alpha/sessions"
)

// HTTPClient is an interface for making HTTP requests.
// It's implemented by *http.Client.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// JulesClient is a client for the Jules API.
type JulesClient struct {
	apiKey     string
	httpClient HTTPClient
}

// NewJulesClient creates a new JulesClient.
func NewJulesClient(apiKey string) *JulesClient {
	return &JulesClient{
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

// CallJulesAPI sends a payload to the Jules API.
func (c *JulesClient) CallJulesAPI(payload interface{}) (map[string]interface{}, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	url := fmt.Sprintf("https://%s%s", julesAPIHostname, julesAPIPath)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("Jules API call failed with status code %d", resp.StatusCode)
	}

	var responseBody map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
		// Return an empty map if the body is empty
		if err.Error() == "EOF" {
			return make(map[string]interface{}), nil
		}
		return nil, fmt.Errorf("failed to decode response body: %w", err)
	}

	fmt.Println("Jules API call successful.")
	return responseBody, nil
}

// GetJulesAPIKey retrieves the Jules API key from the environment.
func GetJulesAPIKey() (string, error) {
	apiKey := os.Getenv("INPUT_JULES_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("missing required input: jules_api_key")
	}
	return apiKey, nil
}
