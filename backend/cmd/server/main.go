package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	httpswagger "github.com/swaggo/http-swagger/v2"

	_ "khanqah/api/docs"
	"khanqah/api/internal/db"
	"khanqah/api/internal/fcm"
	"khanqah/api/internal/handler"
	"khanqah/api/internal/middleware"
	"khanqah/api/internal/sms"
	"khanqah/api/internal/storage"
)

//	@title			Khanqah API
//	@version		1.0
//	@description	REST API for Khanqah app — Islamic audio content, OTP auth, live sessions.
//	@host			arrashid.ennbi.com
//	@BasePath		/api
//	@schemes		https
//
//	@securityDefinitions.apikey	BearerAuth
//	@in							header
//	@name						Authorization
//	@description				JWT token — prefix with "Bearer "
func main() {
	_ = godotenv.Load()

	pool, err := db.Connect(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	smsSvc, err := sms.New(
		os.Getenv("AWS_REGION"),
		os.Getenv("AWS_ACCESS_KEY_ID"),
		os.Getenv("AWS_SECRET_ACCESS_KEY"),
	)
	if err != nil {
		log.Fatalf("sms init: %v", err)
	}

	r2, err := storage.NewR2Client(
		os.Getenv("R2_ACCOUNT_ID"),
		os.Getenv("R2_ACCESS_KEY_ID"),
		os.Getenv("R2_SECRET_ACCESS_KEY"),
		os.Getenv("R2_BUCKET"),
		os.Getenv("R2_CDN_BASE"),
	)
	if err != nil {
		log.Fatalf("r2 init: %v", err)
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET must be set")
	}

	fcmClient, err := fcm.New(context.Background())
	if err != nil {
		log.Fatalf("fcm init: %v", err)
	}
	if fcmClient == nil {
		log.Println("fcm: FIREBASE_CREDENTIALS not set — push notifications disabled")
	}

	r := chi.NewRouter()
	r.Use(chimiddleware.RequestSize(1 << 20)) // 1 MB body limit
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"https://*", "http://localhost:*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
	}))

	r.Route("/api", func(r chi.Router) {
		r.Get("/docs/*", httpswagger.Handler(
			httpswagger.URL("/api/docs/doc.json"),
		))
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })

		// Auth
		r.Post("/auth/otp/send", handler.SendOTP(pool, smsSvc))
		r.Post("/auth/otp/verify", handler.VerifyOTP(pool))
		r.Post("/auth/refresh", handler.RefreshToken(pool))

		// Public
		r.Get("/content", handler.ListContent(pool))
		r.Get("/content/{id}", handler.GetContent(pool))
		r.Get("/categories", handler.ListCategories(pool))
		r.Get("/schedule", handler.ListSchedule(pool))
		r.Get("/live/current", handler.GetCurrentLive(pool))
		r.Get("/live/listeners", handler.GetLiveListeners())
		r.Post("/live/ping", handler.PingLiveListener())
		r.Post("/live/leave", handler.LeaveLive())
		r.Post("/bugs", handler.SubmitBugReport(pool))
		// Internal — called by audio relay, secured with X-Internal-Secret header
		r.Post("/internal/finalize-recording", handler.FinalizeRecording(pool, r2))

		// Listener (any valid JWT)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtSecret))
			r.Get("/me/progress", handler.GetProgress(pool))
			r.Put("/me/progress/{contentId}", handler.UpsertProgress(pool))
			r.Get("/me/playlists", handler.GetPlaylists(pool))
			r.Get("/me/downloads", handler.GetDownloads(pool))

			// Ask Hazrat — key registry
			r.Post("/keys", handler.RegisterDeviceKey(pool))
			r.Get("/keys/shaykh", handler.GetShaykhKey(pool))
			r.Get("/keys/{userId}", handler.GetUserKey(pool))
				r.Post("/qa/upload", handler.GenerateQAUploadURL(r2))
				r.Post("/qa/messages", handler.SendQAMessage(pool, fcmClient))
				r.Get("/qa/threads", handler.ListQAThreads(pool))
				r.Get("/qa/messages", handler.ListQAMessages(pool))
				r.Post("/qa/messages/{id}/read", handler.MarkQAMessageRead(pool))
		})

		// Editor+ (content management, upload, live)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtSecret))
			r.Use(middleware.RequireRole("editor", "admin", "broadcaster"))
			r.Post("/admin/upload", handler.GenerateUploadURL(r2))
			r.Post("/admin/content", handler.CreateContent(pool, fcmClient))
			r.Put("/admin/content/{id}", handler.UpdateContent(pool))
			r.Get("/admin/categories", handler.ListCategories(pool))
			r.Post("/admin/categories", handler.CreateCategory(pool))
			r.Put("/admin/categories/{id}", handler.UpdateCategory(pool))
			r.Post("/admin/live/start", handler.StartLiveSession(pool, fcmClient))
			r.Post("/admin/live/end/{id}", handler.EndLiveSession(pool))
		})

		// Admin only
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtSecret))
			r.Use(middleware.RequireRole("admin"))
			r.Delete("/admin/content/{id}", handler.DeleteContent(pool))
			r.Delete("/admin/categories/{id}", handler.DeleteCategory(pool))
			r.Post("/admin/schedule", handler.CreateScheduledSession(pool))
			r.Put("/admin/schedule/{id}", handler.UpdateScheduledSession(pool))
			r.Delete("/admin/schedule/{id}", handler.DeleteScheduledSession(pool))
			r.Get("/admin/team", handler.ListTeam(pool))
			r.Put("/admin/team/{id}/role", handler.UpdateUserRole(pool))
			r.Put("/admin/team/{id}/name", handler.UpdateUserName(pool))
			r.Delete("/admin/team/{id}", handler.DeleteUser(pool))
			r.Get("/admin/bugs", handler.ListBugReports(pool))
			r.Get("/admin/notification-settings", handler.GetNotificationSettings(pool))
			r.Put("/admin/notification-settings/{key}", handler.UpdateNotificationSetting(pool))
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8090"
	}
	log.Printf("khanqah-api listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
