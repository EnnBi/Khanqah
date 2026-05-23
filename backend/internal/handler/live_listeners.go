package handler

import (
	"net/http"
	"sync"
	"time"

	"khanqah/api/internal/middleware"
)

var listenerTracker = &listenerStore{m: sync.Map{}}

type listenerStore struct{ m sync.Map }

func (s *listenerStore) ping(id string) int {
	s.m.Store(id, time.Now())
	return s.count()
}

func (s *listenerStore) leave(id string) {
	s.m.Delete(id)
}

func (s *listenerStore) count() int {
	now := time.Now()
	n := 0
	s.m.Range(func(k, v any) bool {
		if now.Sub(v.(time.Time)) < 35*time.Second {
			n++
		} else {
			s.m.Delete(k)
		}
		return true
	})
	return n
}

// PingLiveListener godoc
//
//	@Summary	Ping live listener
//	@Tags		live
//	@Produce	json
//	@Success	200	{object}	map[string]int
//	@Router		/live/ping [post]
func PingLiveListener() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.RemoteAddr
		if claims := middleware.ClaimsFromContext(r.Context()); claims != nil {
			id = claims.UserID
		}
		writeJSON(w, http.StatusOK, map[string]int{"listeners": listenerTracker.ping(id)})
	}
}

// GetLiveListeners godoc
//
//	@Summary	Get listener count
//	@Tags		live
//	@Produce	json
//	@Success	200	{object}	map[string]int
//	@Router		/live/listeners [get]
func GetLiveListeners() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]int{"listeners": listenerTracker.count()})
	}
}

// LeaveLive godoc
//
//	@Summary	Leave live session
//	@Tags		live
//	@Success	204
//	@Router		/live/leave [post]
func LeaveLive() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.RemoteAddr
		if claims := middleware.ClaimsFromContext(r.Context()); claims != nil {
			id = claims.UserID
		}
		listenerTracker.leave(id)
		w.WriteHeader(http.StatusNoContent)
	}
}
