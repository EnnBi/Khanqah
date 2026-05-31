package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
	"khanqah/api/internal/fcm"
	"khanqah/api/internal/middleware"
)

// CreateContent godoc
//	@Summary		Create content
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			body	body		object	true	"Content data"
//	@Success		201		{object}	object
//	@Failure		400		{object}	errorResponse
//	@Router			/admin/content [post]
func CreateContent(pool *pgxpool.Pool, fcmClient *fcm.Client) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusInternalServerError, "missing auth context")
			return
		}
		var uploaderID pgtype.UUID
		uploaderID.Scan(claims.UserID)

		var req dbgen.CreateContentParams
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		req.UploadedBy = uploaderID

		row, err := q.CreateContent(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, row)

		if notificationEnabled(r.Context(), pool, "content_upload") {
			go func() {
				if err := fcmClient.SendToTopic(r.Context(), "content_upload",
					"New Content", row.TitleEn); err != nil {
					log.Printf("fcm content_upload: %v", err)
				}
			}()
		}
	}
}

// UpdateContent godoc
//	@Summary		Update content
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id		path		string	true	"Content UUID"
//	@Param			body	body		object	true	"Content data"
//	@Success		200		{object}	object
//	@Failure		400		{object}	errorResponse
//	@Failure		404		{object}	errorResponse
//	@Router			/admin/content/{id} [put]
func UpdateContent(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var id pgtype.UUID
		if err := id.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		var req dbgen.UpdateContentParams
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		req.ID = id
		row, err := q.UpdateContent(r.Context(), req)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "not found")
			} else {
				writeError(w, http.StatusInternalServerError, "internal error")
			}
			return
		}
		writeJSON(w, http.StatusOK, row)
	}
}

// DeleteContent godoc
//	@Summary		Delete content
//	@Tags			admin
//	@Security		BearerAuth
//	@Param			id	path	string	true	"Content UUID"
//	@Success		204
//	@Failure		400	{object}	errorResponse
//	@Router			/admin/content/{id} [delete]
func DeleteContent(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var id pgtype.UUID
		if err := id.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := q.DeleteContent(r.Context(), id); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
