package fcm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"golang.org/x/oauth2/google"
)

const fcmV1Scope = "https://www.googleapis.com/auth/firebase.messaging"

type Client struct {
	projectID string
	creds     *google.Credentials
}

// New returns a Client. Returns nil (no-op) if FIREBASE_CREDENTIALS env var is not set.
func New(ctx context.Context) (*Client, error) {
	credPath := os.Getenv("FIREBASE_CREDENTIALS")
	if credPath == "" {
		return nil, nil
	}
	data, err := os.ReadFile(credPath)
	if err != nil {
		return nil, fmt.Errorf("fcm: read credentials: %w", err)
	}
	creds, err := google.CredentialsFromJSON(ctx, data, fcmV1Scope)
	if err != nil {
		return nil, fmt.Errorf("fcm: parse credentials: %w", err)
	}
	var sa struct {
		ProjectID string `json:"project_id"`
	}
	_ = json.Unmarshal(data, &sa)
	return &Client{projectID: sa.ProjectID, creds: creds}, nil
}

// SendToTopic sends a notification to an FCM topic. No-op if client is nil.
func (c *Client) SendToTopic(ctx context.Context, topic, title, body string) error {
	if c == nil {
		return nil
	}
	tok, err := c.creds.TokenSource.Token()
	if err != nil {
		return fmt.Errorf("fcm: get token: %w", err)
	}
	payload := map[string]any{
		"message": map[string]any{
			"topic": topic,
			"notification": map[string]string{
				"title": title,
				"body":  body,
			},
		},
	}
	b, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://fcm.googleapis.com/v1/projects/%s/messages:send", c.projectID)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("fcm: send: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("fcm: send: status %d", resp.StatusCode)
	}
	return nil
}
