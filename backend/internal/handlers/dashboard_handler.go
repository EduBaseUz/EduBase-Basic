package handlers

import (
	"net/http"

	"edubase/backend/internal/middleware"
	"edubase/backend/pkg/response"
)

// AdminDashboard (admin) returns global aggregates and the P&L.
func (h *Handlers) AdminDashboard(w http.ResponseWriter, r *http.Request) {
	d, err := h.svc.Dashboard.Admin(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, d)
}

// MentorDashboard (mentor) returns the mentor's own aggregates.
func (h *Handlers) MentorDashboard(w http.ResponseWriter, r *http.Request) {
	u := middleware.MustUser(r.Context())
	d, err := h.svc.Dashboard.Mentor(r.Context(), u.ID)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, d)
}

// StudentDashboard (student) returns the student's own aggregates.
func (h *Handlers) StudentDashboard(w http.ResponseWriter, r *http.Request) {
	u := middleware.MustUser(r.Context())
	d, err := h.svc.Dashboard.Student(r.Context(), u.ID)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, d)
}

// Health is a simple liveness probe.
func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	response.OK(w, map[string]any{"status": "ok"})
}
