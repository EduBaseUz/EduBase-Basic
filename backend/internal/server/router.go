package server

import (
	"net/http"

	"edubase/backend/internal/config"
	"edubase/backend/internal/handlers"
	"edubase/backend/internal/middleware"
	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"edubase/backend/pkg/jwt"
	chi "github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

// New builds the fully wired HTTP handler.
func New(cfg *config.Config, h *handlers.Handlers, jwtMgr *jwt.Manager, users repositories.UserRepository) http.Handler {
	r := chi.NewRouter()

	// Global middleware.
	r.Use(chimw.RequestID)
	r.Use(chimw.Recoverer)
	r.Use(middleware.Logging)
	r.Use(middleware.CORS(cfg.FrontendOrigin))

	r.Get("/health", h.Health)

	auth := middleware.Auth(jwtMgr, users)
	loginLimit := middleware.NewRateLimiter(0.5, 5) // ~5 burst, refill 1 per 2s per IP

	r.Route("/api/v1", func(r chi.Router) {
		// --- Public ---
		r.Group(func(r chi.Router) {
			r.Use(loginLimit)
			r.Post("/auth/login", h.Login)
		})
		r.Post("/auth/refresh", h.Refresh)
		r.Post("/auth/logout", h.Logout)

		// --- Authenticated ---
		r.Group(func(r chi.Router) {
			r.Use(auth)

			r.Get("/auth/me", h.Me)
			r.Post("/auth/change-password", h.ChangePassword)

			// Everything below requires the user to have changed their password.
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePasswordChanged)

				// Shared reads (handler scopes by role/ownership).
				r.Get("/groups", h.ListGroups)
				r.Get("/groups/{id}", h.GetGroup)
				r.Get("/groups/{id}/rating", h.GroupRating)
				r.Get("/groups/{id}/lessons", h.ListLessons)
				r.Get("/me/groups", h.MyGroups)
				r.Patch("/me/profile", h.UpdateProfile)
				r.Post("/me/avatar", h.UploadMyAvatar)

				// Mentor + Admin: view a lesson roster.
				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(models.RoleMentor, models.RoleAdmin))
					r.Get("/lessons/{id}", h.GetLesson)
				})

				// Student-only.
				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(models.RoleStudent))
					r.Get("/me/attendance", h.MyAttendance)
					r.Get("/me/grades", h.MyGrades)
					r.Get("/dashboard/student", h.StudentDashboard)
				})

				// Mentor-only.
				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(models.RoleMentor))
					r.Post("/groups/{id}/lessons", h.CreateLesson)
					r.Patch("/lessons/{id}", h.UpdateLesson)
					r.Delete("/lessons/{id}", h.DeleteLesson)
					r.Post("/lessons/{id}/attendance", h.SetAttendance)
					r.Post("/lessons/{id}/grades", h.SetGrades)
					r.Get("/me/payouts", h.MyPayouts)
					r.Get("/dashboard/mentor", h.MentorDashboard)
				})

				// Admin-only.
				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireRole(models.RoleAdmin))

					// Users
					r.Get("/users", h.ListUsers)
					r.Post("/users", h.CreateUser)
					r.Get("/users/{id}", h.GetUser)
					r.Get("/users/{id}/detail", h.UserDetail)
					r.Patch("/users/{id}", h.UpdateUser)
					r.Delete("/users/{id}", h.DeleteUser)
					r.Post("/users/{id}/avatar", h.UploadUserAvatar)
					r.Post("/users/{id}/reset-password", h.ResetUserPassword)
					r.Post("/users/{id}/parent", h.AssignParent)
					r.Post("/users/{id}/children", h.SetChildren)

					// Courses
					r.Get("/courses", h.ListCourses)
					r.Post("/courses", h.CreateCourse)
					r.Get("/courses/{id}", h.GetCourse)
					r.Patch("/courses/{id}", h.UpdateCourse)
					r.Delete("/courses/{id}", h.DeleteCourse)

					// Groups (mutations)
					r.Post("/groups", h.CreateGroup)
					r.Patch("/groups/{id}", h.UpdateGroup)
					r.Delete("/groups/{id}", h.DeleteGroup)
					r.Post("/groups/{id}/mentors", h.SetGroupMentors)
					r.Post("/groups/{id}/students", h.AddGroupStudent)
					r.Delete("/groups/{id}/students/{sid}", h.RemoveGroupStudent)
					r.Post("/groups/{id}/students/{sid}/move", h.MoveGroupStudent)
					r.Post("/groups/{id}/promote", h.PromoteGroupStudents)

					// Finance
					r.Get("/finance/summary", h.FinanceSummary)
					r.Get("/tuition", h.ListTuition)
					r.Get("/tuition/student/{id}", h.StudentTuitionHistory)
					r.Post("/tuition/{id}/transactions", h.AddTuitionTransaction)
					r.Delete("/tuition/{id}/transactions/{txnId}", h.DeleteTuitionTransaction)
					r.Patch("/tuition/{id}", h.UpdateTuition)
					r.Get("/payouts", h.ListPayouts)
					r.Post("/payouts/{id}/transactions", h.AddPayoutTransaction)
					r.Delete("/payouts/{id}/transactions/{txnId}", h.DeletePayoutTransaction)
					r.Get("/finance/debtors", h.Debtors)

					// Qo'shimcha to'lovlar (tashkiliy kirim/chiqim)
					r.Get("/finance/org-transactions", h.ListOrgTransactions)
					r.Post("/finance/org-transactions", h.CreateOrgTransaction)
					r.Patch("/finance/org-transactions/{id}", h.UpdateOrgTransaction)
					r.Delete("/finance/org-transactions/{id}", h.DeleteOrgTransaction)

					// Dashboard
					r.Get("/dashboard/admin", h.AdminDashboard)

					// Settings: default avatar library
					r.Get("/settings/avatars", h.ListDefaultAvatars)
					r.Post("/settings/avatars", h.UploadDefaultAvatar)
					r.Delete("/settings/avatars/{id}", h.DeleteDefaultAvatar)
				})
			})
		})
	})

	return r
}
