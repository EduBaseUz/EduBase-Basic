package handlers

import (
	"net/http"

	"edubase/backend/internal/services"
	"edubase/backend/pkg/response"
)

// ListCourses returns a paginated course list.
func (h *Handlers) ListCourses(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	p := pageFrom(r)
	courses, total, err := h.svc.Course.List(r.Context(), status, p)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, paginated(courses, total, p))
}

// CreateCourse (admin) creates a course.
func (h *Handlers) CreateCourse(w http.ResponseWriter, r *http.Request) {
	var in services.CreateCourseInput
	if !h.decode(w, r, &in) {
		return
	}
	c, err := h.svc.Course.Create(r.Context(), in)
	if err != nil {
		fail(w, err)
		return
	}
	response.Created(w, c)
}

// GetCourse returns a single course.
func (h *Handlers) GetCourse(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	c, err := h.svc.Course.Get(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, c)
}

// UpdateCourse (admin) updates a course.
func (h *Handlers) UpdateCourse(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var in services.UpdateCourseInput
	if !h.decode(w, r, &in) {
		return
	}
	c, err := h.svc.Course.Update(r.Context(), id, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, c)
}

// DeleteCourse (admin) deletes a course.
func (h *Handlers) DeleteCourse(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	if err := h.svc.Course.Delete(r.Context(), id); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}
