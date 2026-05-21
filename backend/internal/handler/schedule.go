package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
)

type scheduleResponse struct {
	dbgen.ScheduledSession
	NextAt time.Time `json:"next_at"`
}

func nextOccurrence(base time.Time, rule *string) time.Time {
	now := time.Now()
	if base.After(now) {
		return base
	}
	if rule == nil {
		return base
	}
	t := base
	switch {
	case strings.Contains(*rule, "FREQ=DAILY"):
		for !t.After(now) {
			t = t.AddDate(0, 0, 1)
		}
	case strings.Contains(*rule, "FREQ=WEEKLY"):
		for !t.After(now) {
			t = t.AddDate(0, 0, 7)
		}
	case strings.Contains(*rule, "FREQ=MONTHLY"):
		for !t.After(now) {
			t = t.AddDate(0, 1, 0)
		}
	}
	return t
}

// ListSchedule godoc
//
//	@Summary	List upcoming scheduled sessions
//	@Tags		schedule
//	@Produce	json
//	@Success	200	{array}		object
//	@Router		/schedule [get]
func ListSchedule(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := q.ListUpcomingSchedule(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		result := make([]scheduleResponse, 0, len(rows))
		for _, s := range rows {
			next := nextOccurrence(s.ScheduledAt.Time, s.RecurrenceRule)
			result = append(result, scheduleResponse{ScheduledSession: s, NextAt: next})
		}

		writeJSON(w, http.StatusOK, result)
	}
}
