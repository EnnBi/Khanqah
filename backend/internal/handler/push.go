package handler

import (
	"context"
	"log"
	"time"
)

// pushTimeout bounds one push send; the FCM client has no timeout of its own.
const pushTimeout = 15 * time.Second

// topicSender is the part of *fcm.Client the broadcast pushes need.
type topicSender interface {
	SendToTopic(ctx context.Context, topic, title, body string) error
}

// notifyTopic sends a broadcast push (live started, new content). Fire-and-forget;
// failures are logged, never surfaced to the caller.
//
// The send runs after the response is written, and a request's context is cancelled the
// moment its handler returns, so the push must not run on that context.
func notifyTopic(ctx context.Context, sender topicSender, topic, title, body string) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), pushTimeout)
	go func() {
		defer cancel()
		if err := sender.SendToTopic(ctx, topic, title, body); err != nil {
			log.Printf("fcm %s: %v", topic, err)
		}
	}()
}
