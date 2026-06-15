package handler

import (
	"context"
	"log"

	"khanqah/api/internal/fcm"
)

// Content-free push strings. NEVER include message content here.
const (
	pushNewQuestionTitle = "نیا سوال"            // "New question"
	pushNewQuestionBody  = "آپ کے پاس ایک نیا سوال ہے۔"
	pushNewAnswerTitle   = "نیا جواب"            // "New answer"
	pushNewAnswerBody    = "آپ کو شیخ کی طرف سے جواب موصول ہوا ہے۔"
)

// userTopic is the per-user FCM topic both apps subscribe to on login.
// Topic names allow [a-zA-Z0-9-_.~%]; a UUID with hyphens is valid.
func userTopic(userID string) string { return "user-" + userID }

// notifyNewMessage sends a content-free push to the recipient. Fire-and-forget;
// failures are logged, never surfaced to the sender. No-op if fcmClient is nil.
func notifyNewMessage(fcmClient *fcm.Client, recipientID, direction string) {
	title, body := pushNewAnswerTitle, pushNewAnswerBody
	if direction == "q" {
		title, body = pushNewQuestionTitle, pushNewQuestionBody
	}
	go func() {
		if err := fcmClient.SendToTopic(context.Background(), userTopic(recipientID), title, body); err != nil {
			log.Printf("qa push to %s: %v", recipientID, err)
		}
	}()
}
