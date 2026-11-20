package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	dbgen "khanqah/api/internal/db/generated"
)

const sharedLiveID = "11111111-1111-1111-1111-111111111111"

type fakeLiveSessions struct {
	row dbgen.LiveSession
	err error
}

func (f fakeLiveSessions) GetLiveSessionByID(_ context.Context, _ pgtype.UUID) (dbgen.LiveSession, error) {
	return f.row, f.err
}

// getSharedLive serves GET /live/{id} the way the router does and returns the response.
func getSharedLive(t *testing.T, sessions liveSessionGetter, id string) *httptest.ResponseRecorder {
	t.Helper()
	r := chi.NewRouter()
	r.Get("/live/{id}", getLiveSession(sessions))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/live/"+id, nil))
	return rec
}

func liveSessionRow(status dbgen.LiveSessionStatus) dbgen.LiveSession {
	var id pgtype.UUID
	id.Scan(sharedLiveID)
	return dbgen.LiveSession{ID: id, TitleEn: "Majlis", StreamUrl: hlsStreamURL, Status: status}
}

// A shared link keeps working after the broadcast: the page needs the ended status to say so.
func TestGetLiveSession_ReturnsEndedSessions(t *testing.T) {
	for _, status := range []dbgen.LiveSessionStatus{dbgen.LiveSessionStatusLive, dbgen.LiveSessionStatusEnded} {
		rec := getSharedLive(t, fakeLiveSessions{row: liveSessionRow(status)}, sharedLiveID)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: status = %d, want 200", status, rec.Code)
		}
		var got struct {
			ID        string `json:"id"`
			Status    string `json:"status"`
			StreamURL string `json:"stream_url"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
			t.Fatal(err)
		}
		if got.ID != sharedLiveID || got.Status != string(status) || got.StreamURL != hlsStreamURL {
			t.Errorf("%s: got %+v", status, got)
		}
	}
}

func TestGetLiveSession_UnknownIDIsNotFound(t *testing.T) {
	rec := getSharedLive(t, fakeLiveSessions{err: pgx.ErrNoRows}, sharedLiveID)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

func TestGetLiveSession_MalformedIDIsBadRequest(t *testing.T) {
	rec := getSharedLive(t, fakeLiveSessions{}, "not-a-uuid")
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", rec.Code)
	}
}

func TestGetLiveSession_DatabaseFailureIsInternalError(t *testing.T) {
	rec := getSharedLive(t, fakeLiveSessions{err: errors.New("connection reset")}, sharedLiveID)
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
}
