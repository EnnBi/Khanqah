package auth_test

import (
	"testing"

	"khanqah/api/internal/auth"
)

func TestGenerateOTP(t *testing.T) {
	otp, err := auth.GenerateOTP()
	if err != nil {
		t.Fatalf("GenerateOTP: %v", err)
	}
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
	ok, err := auth.VerifyOTP(otp, hash)
	if err != nil {
		t.Fatalf("VerifyOTP: %v", err)
	}
	if !ok {
		t.Error("VerifyOTP returned false for correct OTP")
	}
	ok, err = auth.VerifyOTP("999999", hash)
	if err != nil {
		t.Fatalf("VerifyOTP unexpected error for wrong OTP: %v", err)
	}
	if ok {
		t.Error("VerifyOTP returned true for wrong OTP")
	}
}
