package handlers

import (
	"net/http"

	"edubase/backend/internal/middleware"
	"edubase/backend/internal/models"
	"edubase/backend/internal/services"
	"edubase/backend/pkg/response"
)

// CreateLesson (mentor) creates a lesson + homework for an owned group.
func (h *Handlers) CreateLesson(w http.ResponseWriter, r *http.Request) {
	gid, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var in services.CreateLessonInput
	if !h.decode(w, r, &in) {
		return
	}
	mentorID := middleware.UserID(r.Context())
	l, err := h.svc.Journal.CreateLesson(r.Context(), gid, mentorID, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.Created(w, l)
}

// ListLessons returns lessons for a group (access-scoped).
func (h *Handlers) ListLessons(w http.ResponseWriter, r *http.Request) {
	gid, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	g, err := h.svc.Group.Get(r.Context(), gid)
	if err != nil {
		fail(w, err)
		return
	}
	if !h.canAccessGroup(r, g) {
		response.Forbidden(w, "Sizda ruxsat yo'q")
		return
	}
	p := pageFrom(r)
	lessons, total, err := h.svc.Journal.ListLessons(r.Context(), gid, p)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, paginated(lessons, total, p))
}

// GetLesson returns a lesson with homework and roster (access-scoped).
// Students never receive numeric grades through this endpoint (mentor/admin only).
func (h *Handlers) GetLesson(w http.ResponseWriter, r *http.Request) {
	lid, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	l, err := h.svc.Journal.GetLesson(r.Context(), lid)
	if err != nil {
		fail(w, err)
		return
	}
	g, err := h.svc.Group.Get(r.Context(), l.GroupID)
	if err != nil {
		fail(w, err)
		return
	}
	u := middleware.MustUser(r.Context())
	if u.Role == models.RoleStudent {
		response.Forbidden(w, "Sizda ruxsat yo'q")
		return
	}
	if !h.canAccessGroup(r, g) {
		response.Forbidden(w, "Sizda ruxsat yo'q")
		return
	}
	hw, _ := h.svc.Journal.GetHomework(r.Context(), lid)
	roster, err := h.svc.Journal.LessonRoster(r.Context(), lid)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{
		"lesson":      l,
		"homework":    hw,
		"attendances": roster.Attendances,
		"grades":      roster.Grades,
	})
}

// UpdateLesson (mentor) edits a lesson.
func (h *Handlers) UpdateLesson(w http.ResponseWriter, r *http.Request) {
	lid, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var in services.UpdateLessonInput
	if !h.decode(w, r, &in) {
		return
	}
	mentorID := middleware.UserID(r.Context())
	l, err := h.svc.Journal.UpdateLesson(r.Context(), lid, mentorID, false, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, l)
}

// DeleteLesson (mentor) deletes a lesson and its records.
func (h *Handlers) DeleteLesson(w http.ResponseWriter, r *http.Request) {
	lid, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	mentorID := middleware.UserID(r.Context())
	if err := h.svc.Journal.DeleteLesson(r.Context(), lid, mentorID, false); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}

type attendanceRequest struct {
	Items []services.AttendanceItem `json:"items" validate:"required,dive"`
}

// SetAttendance (mentor) bulk-marks attendance.
func (h *Handlers) SetAttendance(w http.ResponseWriter, r *http.Request) {
	lid, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var req attendanceRequest
	if !h.decode(w, r, &req) {
		return
	}
	mentorID := middleware.UserID(r.Context())
	if err := h.svc.Journal.SetAttendance(r.Context(), lid, mentorID, false, req.Items); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}

type gradesRequest struct {
	Items []services.GradeItem `json:"items" validate:"required,dive"`
}

// SetGrades (mentor) bulk-sets grades (present/late only).
func (h *Handlers) SetGrades(w http.ResponseWriter, r *http.Request) {
	lid, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var req gradesRequest
	if !h.decode(w, r, &req) {
		return
	}
	mentorID := middleware.UserID(r.Context())
	if err := h.svc.Journal.SetGrades(r.Context(), lid, mentorID, false, req.Items); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}
