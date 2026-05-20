package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
)

// ListTeam godoc
//	@Summary		List all users
//	@Tags			admin
//	@Produce		json
//	@Security		BearerAuth
//	@Param			limit	query	int	false	"Max results (default 50)"
//	@Param			offset	query	int	false	"Pagination offset"
//	@Success		200	{array}		object
//	@Router			/admin/team [get]
func ListTeam(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		limit := int32(50)
		offset := int32(0)
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				limit = int32(n)
			}
		}
		if v := r.URL.Query().Get("offset"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n >= 0 {
				offset = int32(n)
			}
		}
		users, err := q.ListUsers(r.Context(), dbgen.ListUsersParams{Limit: limit, Offset: offset})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		if users == nil {
			users = []dbgen.User{}
		}
		writeJSON(w, http.StatusOK, users)
	}
}

// UpdateUserRole godoc
//	@Summary		Update user role
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id		path		string				true	"User UUID"
//	@Param			body	body		updateUserRoleRequest	true	"New role"
//	@Success		200		{object}	object
//	@Failure		400		{object}	errorResponse
//	@Router			/admin/team/{id}/role [put]
func UpdateUserRole(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var id pgtype.UUID
		if err := id.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}

		var body struct {
			Role string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}

		validRoles := map[dbgen.UserRole]bool{
			dbgen.UserRoleListener:    true,
			dbgen.UserRoleEditor:      true,
			dbgen.UserRoleAdmin:       true,
			dbgen.UserRoleBroadcaster: true,
		}
		role := dbgen.UserRole(body.Role)
		if !validRoles[role] {
			writeError(w, http.StatusBadRequest, "invalid role")
			return
		}

		user, err := q.UpdateUserRole(r.Context(), dbgen.UpdateUserRoleParams{ID: id, Role: role})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, user)
	}
}
