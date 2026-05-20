package auth_test

import (
	"testing"
	"time"

	"khanqah/api/internal/auth"
)

func TestSignAndVerify(t *testing.T) {
	secret := "test-secret-at-least-32-chars-xx"
	token, err := auth.SignToken(secret, "user-123", "admin")
	if err != nil {
		t.Fatalf("SignToken: %v", err)
	}
	claims, err := auth.VerifyToken(secret, token)
	if err != nil {
		t.Fatalf("VerifyToken: %v", err)
	}
	if claims.UserID != "user-123" {
		t.Errorf("UserID = %q, want %q", claims.UserID, "user-123")
	}
	if claims.Role != "admin" {
		t.Errorf("Role = %q, want %q", claims.Role, "admin")
	}
}

func TestVerifyExpiredToken(t *testing.T) {
	secret := "test-secret-at-least-32-chars-xx"
	token, _ := auth.SignTokenWithExpiry(secret, "user-123", "listener", -time.Minute)
	_, err := auth.VerifyToken(secret, token)
	if err == nil {
		t.Error("expected error for expired token, got nil")
	}
}

func TestVerifyWrongSecret(t *testing.T) {
	token, _ := auth.SignToken("secret-one-xxxxxxxxxxxxxxxxxxxxx", "user-1", "listener")
	_, err := auth.VerifyToken("secret-two-xxxxxxxxxxxxxxxxxxxxx", token)
	if err == nil {
		t.Error("expected error for wrong secret, got nil")
	}
}

func TestVerifyAlgNone(t *testing.T) {
	// Manually crafted "alg:none" token (not signed)
	// header: {"alg":"none","typ":"JWT"}, payload: {"user_id":"x","role":"admin"}
	// This tests that our keyfunc rejects non-HMAC algorithms
	token := "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyX2lkIjoieCIsInJvbGUiOiJhZG1pbiJ9."
	_, err := auth.VerifyToken("any-secret", token)
	if err == nil {
		t.Error("expected error for alg:none token, got nil")
	}
}
