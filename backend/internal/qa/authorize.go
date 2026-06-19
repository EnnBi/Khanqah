// Package qa holds pure (DB-free) helpers for the Ask Hazrat Q&A feature:
// thread authorization and message-request validation.
package qa

import (
	"encoding/base64"
	"fmt"
)

// MessageRequest is the JSON body for POST /qa/messages. Binary fields are
// base64-encoded strings; the handler decodes them after validation.
type MessageRequest struct {
	ThreadID         string `json:"thread_id"`          // optional; empty => create/find thread (questions only)
	Direction        string `json:"direction"`          // "q" | "a"
	ContentType      string `json:"content_type"`       // "text" | "audio"
	CiphertextRef    string `json:"ciphertext_ref"`     // R2 key (audio)
	CiphertextInline string `json:"ciphertext_inline"`  // base64 ciphertext (text)
	EncCEK           string `json:"enc_cek"`            // base64
	NonceKey         string `json:"nonce_key"`          // base64
	NoncePayload     string `json:"nonce_payload"`      // base64
	SenderKeyID      string `json:"sender_key_id"`      // device_keys.id
	ByteSize         int64  `json:"byte_size"`
	ReplyTo          string `json:"reply_to"`           // answers: id of the question being answered
}

// CanAccessThread reports whether requester is a participant of a thread owned
// by threadUserID with the given threadShaykhID.
func CanAccessThread(requesterID, threadUserID, threadShaykhID string) bool {
	return requesterID == threadUserID || requesterID == threadShaykhID
}

func isBase64(s string) bool {
	_, err := base64.StdEncoding.DecodeString(s)
	return err == nil
}

// ValidateMessageRequest checks structural validity without touching the DB.
func ValidateMessageRequest(m MessageRequest) error {
	if m.Direction != "q" && m.Direction != "a" {
		return fmt.Errorf("direction must be 'q' or 'a'")
	}
	if m.ContentType != "text" && m.ContentType != "audio" {
		return fmt.Errorf("content_type must be 'text' or 'audio'")
	}
	if m.SenderKeyID == "" {
		return fmt.Errorf("sender_key_id is required")
	}
	for name, v := range map[string]string{
		"enc_cek": m.EncCEK, "nonce_key": m.NonceKey, "nonce_payload": m.NoncePayload,
	} {
		if v == "" {
			return fmt.Errorf("%s is required", name)
		}
		if !isBase64(v) {
			return fmt.Errorf("%s is not valid base64", name)
		}
	}
	switch m.ContentType {
	case "text":
		if m.CiphertextInline == "" {
			return fmt.Errorf("ciphertext_inline is required for text messages")
		}
		if !isBase64(m.CiphertextInline) {
			return fmt.Errorf("ciphertext_inline is not valid base64")
		}
	case "audio":
		if m.CiphertextRef == "" {
			return fmt.Errorf("ciphertext_ref is required for audio messages")
		}
	}
	return nil
}

// DecodeField decodes a base64 field that has already passed validation.
func DecodeField(s string) []byte {
	b, _ := base64.StdEncoding.DecodeString(s)
	return b
}
