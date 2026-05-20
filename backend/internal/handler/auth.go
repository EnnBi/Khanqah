package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"khanqah/api/internal/auth"
	dbgen "khanqah/api/internal/db/generated"
	"khanqah/api/internal/sms"
)

// uuidString formats a pgtype.UUID as a canonical hyphenated UUID string.
func uuidString(u pgtype.UUID) string {
	b := u.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func SendOTP(pool *pgxpool.Pool, smsSvc *sms.Client) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Phone string `json:"phone"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Phone == "" {
			writeError(w, http.StatusBadRequest, "phone is required")
			return
		}

		count, err := q.CountRecentOTPsByPhone(r.Context(), req.Phone)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if count >= 3 {
			writeError(w, http.StatusTooManyRequests, "too many OTP requests, try again in 10 minutes")
			return
		}

		otp, err := auth.GenerateOTP()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		hash, err := auth.HashOTP(otp)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		if _, err := q.CreateOTP(r.Context(), dbgen.CreateOTPParams{
			Phone:     req.Phone,
			OtpHash:   hash,
			ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(10 * time.Minute), Valid: true},
		}); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		if err := smsSvc.SendOTP(r.Context(), req.Phone, otp); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to send SMS")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "OTP sent"})
	}
}

func VerifyOTP(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	secret := os.Getenv("JWT_SECRET")
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Phone string `json:"phone"`
			OTP   string `json:"otp"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Phone == "" || req.OTP == "" {
			writeError(w, http.StatusBadRequest, "phone and otp are required")
			return
		}

		otpRow, err := q.GetLatestOTPByPhone(r.Context(), req.Phone)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid or expired OTP")
			return
		}
		if otpRow.Attempts >= 3 {
			writeError(w, http.StatusUnauthorized, "OTP invalidated due to too many attempts")
			return
		}

		ok, err := auth.VerifyOTP(req.OTP, otpRow.OtpHash)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if !ok {
			// fire and forget — ignore error
			_, _ = q.IncrementOTPAttempts(r.Context(), otpRow.ID)
			writeError(w, http.StatusUnauthorized, "invalid OTP")
			return
		}
		_ = q.MarkOTPUsed(r.Context(), otpRow.ID)

		user, err := q.GetUserByPhone(r.Context(), req.Phone)
		if err != nil {
			user, err = q.CreateUser(r.Context(), dbgen.CreateUserParams{
				Phone:       req.Phone,
				DisplayName: "",
			})
			if err != nil {
				writeError(w, http.StatusInternalServerError, "internal error")
				return
			}
		}

		accessToken, err := auth.SignToken(secret, uuidString(user.ID), string(user.Role))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		// Generate a 12-char raw refresh token using two OTP calls
		raw1, err := auth.GenerateOTP()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		raw2, err := auth.GenerateOTP()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		refreshRaw := raw1 + raw2

		refreshHash, err := bcrypt.GenerateFromPassword([]byte(refreshRaw), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		rtRow, err := q.CreateRefreshToken(r.Context(), dbgen.CreateRefreshTokenParams{
			UserID:    user.ID,
			TokenHash: string(refreshHash),
			ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(30 * 24 * time.Hour), Valid: true},
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"access_token":  accessToken,
			"refresh_token": uuidString(rtRow.ID) + "." + refreshRaw,
			"role":          string(user.Role),
		})
	}
}

func RefreshToken(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	secret := os.Getenv("JWT_SECRET")
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
			writeError(w, http.StatusBadRequest, "refresh_token is required")
			return
		}

		parts := splitRefreshToken(req.RefreshToken)
		if parts == nil {
			writeError(w, http.StatusUnauthorized, "invalid refresh token")
			return
		}

		rtRow, err := q.GetRefreshToken(r.Context(), parts.id)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "refresh token expired or not found")
			return
		}
		if bcrypt.CompareHashAndPassword([]byte(rtRow.TokenHash), []byte(parts.raw)) != nil {
			writeError(w, http.StatusUnauthorized, "invalid refresh token")
			return
		}

		_ = q.DeleteRefreshToken(r.Context(), parts.id)

		user, err := q.GetUserByID(r.Context(), rtRow.UserID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		accessToken, err := auth.SignToken(secret, uuidString(user.ID), string(user.Role))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"access_token": accessToken})
	}
}

type refreshParts struct {
	id  pgtype.UUID
	raw string
}

func splitRefreshToken(token string) *refreshParts {
	idx := strings.Index(token, ".")
	if idx < 1 {
		return nil
	}
	var id pgtype.UUID
	if err := id.Scan(token[:idx]); err != nil {
		return nil
	}
	return &refreshParts{id: id, raw: token[idx+1:]}
}
