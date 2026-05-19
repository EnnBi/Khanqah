package auth

import (
	"crypto/rand"
	"fmt"
	"math/big"

	"golang.org/x/crypto/bcrypt"
)

func GenerateOTP() string {
	digits := make([]byte, 6)
	for i := range digits {
		n, _ := rand.Int(rand.Reader, big.NewInt(10))
		digits[i] = byte('0') + byte(n.Int64())
	}
	return string(digits)
}

func HashOTP(otp string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(otp), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("auth.HashOTP: %w", err)
	}
	return string(hash), nil
}

func VerifyOTP(otp, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(otp)) == nil
}
