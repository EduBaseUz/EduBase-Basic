package handlers

import (
	"net/http"

	"edubase/backend/internal/middleware"
	"edubase/backend/internal/models"
	"edubase/backend/internal/services"
	"edubase/backend/pkg/response"
)

// MyGroups returns the caller's groups (student: enrolled, mentor: assigned).
func (h *Handlers) MyGroups(w http.ResponseWriter, r *http.Request) {
	u := middleware.MustUser(r.Context())
	switch u.Role {
	case models.RoleStudent:
		groups, err := h.svc.Academic.MyGroups(r.Context(), u.ID)
		if err != nil {
			fail(w, err)
			return
		}
		response.OK(w, groups)
	case models.RoleMentor:
		p := pageFrom(r)
		groups, _, err := h.svc.Group.ListByMentor(r.Context(), u.ID, p)
		if err != nil {
			fail(w, err)
			return
		}
		response.OK(w, groups)
	default:
		response.Forbidden(w, "Sizda ruxsat yo'q")
	}
}

// MyAttendance returns the student's attendance.
func (h *Handlers) MyAttendance(w http.ResponseWriter, r *http.Request) {
	u := middleware.MustUser(r.Context())
	rows, err := h.svc.Academic.MyAttendance(r.Context(), u.ID)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, rows)
}

// MyGrades returns the student's grades as P/M/D letters only.
func (h *Handlers) MyGrades(w http.ResponseWriter, r *http.Request) {
	u := middleware.MustUser(r.Context())
	rows, err := h.svc.Academic.MyGrades(r.Context(), u.ID)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, rows)
}

// MyPayouts returns the mentor's salary history (auto-synced for the current month).
func (h *Handlers) MyPayouts(w http.ResponseWriter, r *http.Request) {
	u := middleware.MustUser(r.Context())
	payouts, err := h.svc.Payout.ListByMentor(r.Context(), u.ID)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, payouts)
}

// UpdateProfile lets the caller edit their own profile.
func (h *Handlers) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	u := middleware.MustUser(r.Context())
	var in services.UpdateUserInput
	if !h.decode(w, r, &in) {
		return
	}
	updated, err := h.svc.User.UpdateOwnProfile(r.Context(), u.ID, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, updated)
}
