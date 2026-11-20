package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// slowSender stands in for FCM: the send takes longer than the handler does to return,
// and reports whether its context was still alive when it finished.
type slowSender struct {
	result chan error
	topic  string
}

func (s *slowSender) SendToTopic(ctx context.Context, topic, title, body string) error {
	s.topic = topic
	select {
	case <-ctx.Done():
		s.result <- ctx.Err()
		return ctx.Err()
	case <-time.After(100 * time.Millisecond):
		s.result <- nil
		return nil
	}
}

func TestNotifyTopic_OutlivesTheRequest(t *testing.T) {
	sender := &slowSender{result: make(chan error, 1)}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		notifyTopic(r.Context(), sender, "broadcast_live", "Live Now", "Majlis is now live")
	}))
	defer srv.Close()

	resp, err := http.Get(srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()

	select {
	case err := <-sender.result:
		if err != nil {
			t.Fatalf("push was aborted after the handler returned: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("push was never sent")
	}
	if sender.topic != "broadcast_live" {
		t.Errorf("topic = %q, want broadcast_live", sender.topic)
	}
}
