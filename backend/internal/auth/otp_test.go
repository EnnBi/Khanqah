package auth_test

import (
	"testing"

	"khanqah/api/internal/auth"
)

func TestGenerateOTP(t *testing.T) {
	otp := auth.GenerateOTP()
	if len(otp) != 6 {
		t.Errorf("OTP length = %d, want 6", len(otp))
	}
	for _, c := range otp {
		if c < '0' || c > '9' {
			t.Errorf("OTP contains non-digit: %q", string(c))
		}
	}
}

func TestHashAndVerifyOTP(t *testing.T) {
	otp := "123456"
	hash, err := auth.HashOTP(otp)
	if err != nil {
		t.Fatalf("HashOTP: %v", err)
	}
	if !auth.VerifyOTP(otp, hash) {
		t.Error("VerifyOTP returned false for correct OTP")
	}
	if auth.VerifyOTP("999999", hash) {
		t.Error("VerifyOTP returned true for wrong OTP")
	}
}
