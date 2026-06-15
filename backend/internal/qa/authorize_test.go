package qa

import "testing"

func TestCanAccessThread(t *testing.T) {
	const user = "11111111-1111-1111-1111-111111111111"
	const shaykh = "22222222-2222-2222-2222-222222222222"
	const stranger = "33333333-3333-3333-3333-333333333333"

	cases := []struct {
		name      string
		requester string
		threadUsr string
		threadShk string
		want      bool
	}{
		{"questioner allowed", user, user, shaykh, true},
		{"shaykh allowed", shaykh, user, shaykh, true},
		{"stranger denied", stranger, user, shaykh, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := CanAccessThread(c.requester, c.threadUsr, c.threadShk); got != c.want {
				t.Fatalf("CanAccessThread = %v, want %v", got, c.want)
			}
		})
	}
}

func TestValidateMessageRequest(t *testing.T) {
	valid := MessageRequest{
		Direction:   "q",
		ContentType: "text",
		EncCEK:      "AAAA",
		NonceKey:    "AAAA",
		NoncePayload: "AAAA",
		SenderKeyID: "44444444-4444-4444-4444-444444444444",
		CiphertextInline: "AAAA",
	}
	if err := ValidateMessageRequest(valid); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}

	badDir := valid
	badDir.Direction = "x"
	if err := ValidateMessageRequest(badDir); err == nil {
		t.Fatal("expected error for bad direction")
	}

	audioNoRef := valid
	audioNoRef.ContentType = "audio"
	audioNoRef.CiphertextInline = ""
	audioNoRef.CiphertextRef = ""
	if err := ValidateMessageRequest(audioNoRef); err == nil {
		t.Fatal("expected error: audio message needs ciphertext_ref")
	}

	textNoInline := valid
	textNoInline.CiphertextInline = ""
	if err := ValidateMessageRequest(textNoInline); err == nil {
		t.Fatal("expected error: text message needs ciphertext_inline")
	}

	badB64 := valid
	badB64.EncCEK = "!!!notbase64!!!"
	if err := ValidateMessageRequest(badB64); err == nil {
		t.Fatal("expected error for invalid base64 enc_cek")
	}
}
