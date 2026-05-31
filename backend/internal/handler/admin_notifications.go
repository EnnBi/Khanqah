package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationSetting struct {
	Key     string `json:"key"`
	Enabled bool   `json:"enabled"`
}

func GetNotificationSettings(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := pool.Query(r.Context(),
			`SELECT key, enabled FROM notification_settings ORDER BY key`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		defer rows.Close()
		var settings []NotificationSetting
		for rows.Next() {
			var s NotificationSetting
			if err := rows.Scan(&s.Key, &s.Enabled); err != nil {
				writeError(w, http.StatusInternalServerError, "internal error")
				return
			}
			settings = append(settings, s)
		}
		writeJSON(w, http.StatusOK, settings)
	}
}

func UpdateNotificationSetting(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := chi.URLParam(r, "key")
		var body struct {
			Enabled bool `json:"enabled"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		var s NotificationSetting
		err := pool.QueryRow(r.Context(),
			`UPDATE notification_settings SET enabled = $1, updated_at = NOW()
			 WHERE key = $2 RETURNING key, enabled`,
			body.Enabled, key,
		).Scan(&s.Key, &s.Enabled)
		if err != nil {
			writeError(w, http.StatusNotFound, "setting not found")
			return
		}
		writeJSON(w, http.StatusOK, s)
	}
}

// notificationEnabled returns the enabled flag for a key. Fails open (returns true) on error.
func notificationEnabled(ctx context.Context, pool *pgxpool.Pool, key string) bool {
	var enabled bool
	err := pool.QueryRow(ctx,
		`SELECT enabled FROM notification_settings WHERE key = $1`, key,
	).Scan(&enabled)
	if err != nil {
		return true
	}
	return enabled
}
