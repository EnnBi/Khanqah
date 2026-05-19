package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"khanqah/api/internal/auth"
	"khanqah/api/internal/middleware"
)

const testSecret = "test-secret-at-least-32-chars-xx"

func okHandler(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	w.Write([]byte(claims.Role))
}

func TestRequireAuth_Valid(t *testing.T) {
	token, _ := auth.SignToken(testSecret, "user-1", "listener")
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	middleware.RequireAuth(testSecret)(http.HandlerFunc(okHandler)).ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rr.Code)
	}
	if rr.Body.String() != "listener" {
		t.Errorf("body = %q, want %q", rr.Body.String(), "listener")
	}
}

func TestRequireAuth_NoToken(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	middleware.RequireAuth(testSecret)(http.HandlerFunc(okHandler)).ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rr.Code)
	}
}

func TestRequireRole_Allowed(t *testing.T) {
	token, _ := auth.SignToken(testSecret, "user-1", "admin")
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	handler := middleware.RequireAuth(testSecret)(
		middleware.RequireRole("admin", "editor")(http.HandlerFunc(okHandler)),
	)
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rr.Code)
	}
}

func TestRequireRole_Forbidden(t *testing.T) {
	token, _ := auth.SignToken(testSecret, "user-1", "listener")
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	handler := middleware.RequireAuth(testSecret)(
		middleware.RequireRole("admin")(http.HandlerFunc(okHandler)),
	)
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", rr.Code)
	}
}
