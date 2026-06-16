package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
	"khanqah/api/internal/fcm"
	"khanqah/api/internal/middleware"
	"khanqah/api/internal/qa"
)

// strPtr returns nil for empty strings, else a pointer. Matches sqlc's nullable
// text columns (emit_pointers_for_null_types => *string).
func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// SendQAMessage godoc
//	@Summary	Submit an encrypted question or answer
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/messages [post]
func SendQAMessage(pool *pgxpool.Pool, fcmClient *fcm.Client) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var req qa.MessageRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if err := qa.ValidateMessageRequest(req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		var senderID pgtype.UUID
		_ = senderID.Scan(claims.UserID)
		var senderKeyID pgtype.UUID
		if err := senderKeyID.Scan(req.SenderKeyID); err != nil {
			writeError(w, http.StatusBadRequest, "invalid sender_key_id")
			return
		}
		// The sender_key must belong to the sender.
		sk, err := q.GetDeviceKeyByID(r.Context(), senderKeyID)
		if err != nil || uuidString(sk.UserID) != claims.UserID {
			writeError(w, http.StatusBadRequest, "sender_key_id does not belong to you")
			return
		}

		shaykhID, err := q.GetShaykhUserID(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "no shaykh configured")
			return
		}

		var thread dbgen.QaThread
		var recipientID pgtype.UUID
		switch req.Direction {
		case "q": // user → shaykh
			if req.ThreadID != "" {
				// Follow-up: continue an existing thread (must be the sender's own).
				var tid pgtype.UUID
				if err := tid.Scan(req.ThreadID); err != nil {
					writeError(w, http.StatusBadRequest, "invalid thread_id")
					return
				}
				thread, err = q.GetThreadByID(r.Context(), tid)
				if err != nil || uuidString(thread.UserID) != claims.UserID {
					writeError(w, http.StatusForbidden, "not your thread")
					return
				}
			} else {
				// A fresh question always starts its own thread, so each question
				// is answered independently (no merging into one open thread).
				thread, err = q.CreateQAThread(r.Context(), dbgen.CreateQAThreadParams{
					UserID: senderID, ShaykhID: shaykhID,
				})
				if err != nil {
					writeError(w, http.StatusInternalServerError, "internal error")
					return
				}
			}
			recipientID = shaykhID
		case "a": // shaykh → user
			if claims.Role != "shaykh" {
				writeError(w, http.StatusForbidden, "only the shaykh may answer")
				return
			}
			var tid pgtype.UUID
			if err := tid.Scan(req.ThreadID); err != nil {
				writeError(w, http.StatusBadRequest, "thread_id required for answers")
				return
			}
			thread, err = q.GetThreadByID(r.Context(), tid)
			if err != nil {
				writeError(w, http.StatusNotFound, "thread not found")
				return
			}
			recipientID = thread.UserID
		}

		msg, err := q.CreateQAMessage(r.Context(), dbgen.CreateQAMessageParams{
			ThreadID:         thread.ID,
			SenderID:         senderID,
			RecipientID:      recipientID,
			Direction:        req.Direction,
			ContentType:      req.ContentType,
			CiphertextRef:    strPtr(req.CiphertextRef),
			CiphertextInline: qa.DecodeField(req.CiphertextInline),
			EncCek:           qa.DecodeField(req.EncCEK),
			NonceKey:         qa.DecodeField(req.NonceKey),
			NoncePayload:     qa.DecodeField(req.NoncePayload),
			SenderKeyID:      senderKeyID,
			ByteSize:         req.ByteSize,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		newStatus := "open"
		if req.Direction == "a" {
			newStatus = "answered"
		}
		_ = q.TouchThread(r.Context(), dbgen.TouchThreadParams{ID: thread.ID, Status: newStatus})
		_ = q.CreateAuditLog(r.Context(), dbgen.CreateAuditLogParams{
			UserID: senderID, EventType: "msg_sent",
		})

		notifyNewMessage(fcmClient, uuidString(recipientID), req.Direction, uuidString(thread.ID))
		writeJSON(w, http.StatusCreated, map[string]string{
			"id":        uuidString(msg.ID),
			"thread_id": uuidString(thread.ID),
		})
	}
}

// ListQAThreads godoc
//	@Summary	List threads (own for users, full queue for the shaykh)
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/threads [get]
func ListQAThreads(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var id pgtype.UUID
		_ = id.Scan(claims.UserID)
		if claims.Role == "shaykh" {
			rows, err := q.ListThreadsForShaykh(r.Context(), id)
			if err != nil {
				log.Printf("qa ListThreadsForShaykh(%q): %v", claims.UserID, err)
				writeError(w, http.StatusInternalServerError, "internal error")
				return
			}
			if rows == nil {
				rows = []dbgen.QaThread{}
			}
			writeJSON(w, http.StatusOK, rows)
			return
		}
		rows, err := q.ListThreadsForUser(r.Context(), id)
		if err != nil {
			log.Printf("qa ListThreadsForUser(%q): %v", claims.UserID, err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if rows == nil {
			rows = []dbgen.QaThread{}
		}
		writeJSON(w, http.StatusOK, rows)
	}
}

// ListQAMessages godoc
//	@Summary	List encrypted messages in a thread (participants only)
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/messages [get]
func ListQAMessages(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var tid pgtype.UUID
		if err := tid.Scan(r.URL.Query().Get("thread_id")); err != nil {
			writeError(w, http.StatusBadRequest, "thread_id required")
			return
		}
		thread, err := q.GetThreadByID(r.Context(), tid)
		if err != nil {
			writeError(w, http.StatusNotFound, "thread not found")
			return
		}
		if !qa.CanAccessThread(claims.UserID, uuidString(thread.UserID), uuidString(thread.ShaykhID)) {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		rows, err := q.ListMessagesByThread(r.Context(), tid)
		if err != nil {
			log.Printf("qa ListMessagesByThread: %v", err)
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if rows == nil {
			rows = []dbgen.QaMessage{}
		}
		writeJSON(w, http.StatusOK, rows)
	}
}

// MarkQAMessageRead godoc
//	@Summary	Mark a message as read (recipient only)
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/messages/{id}/read [post]
func MarkQAMessageRead(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var mid pgtype.UUID
		if err := mid.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		msg, err := q.GetMessageByID(r.Context(), mid)
		if err != nil {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		if uuidString(msg.RecipientID) != claims.UserID {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		if err := q.MarkMessageRead(r.Context(), mid); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		var uid pgtype.UUID
		_ = uid.Scan(claims.UserID)
		_ = q.CreateAuditLog(r.Context(), dbgen.CreateAuditLogParams{UserID: uid, EventType: "msg_read"})
		w.WriteHeader(http.StatusNoContent)
	}
}
