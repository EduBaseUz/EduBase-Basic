package handlers

import (
	"net/http"

	"edubase/backend/internal/middleware"
	"edubase/backend/internal/models"
	"edubase/backend/internal/services"
	"edubase/backend/pkg/response"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// canAccessGroup checks whether the current user may view a group.
func (h *Handlers) canAccessGroup(r *http.Request, g *models.Group) bool {
	u := middleware.MustUser(r.Context())
	switch u.Role {
	case models.RoleAdmin:
		return true
	case models.RoleMentor:
		return services.MentorOwnsGroup(g, u.ID)
	case models.RoleStudent:
		if e, err := h.svc.Group.ListEnrollments(r.Context(), g.ID); err == nil {
			for _, en := range e {
				if en.StudentID == u.ID {
					return true
				}
			}
		}
		return false
	default:
		return false
	}
}

// ListGroups returns groups scoped to the caller's role.
func (h *Handlers) ListGroups(w http.ResponseWriter, r *http.Request) {
	u := middleware.MustUser(r.Context())
	p := pageFrom(r)
	switch u.Role {
	case models.RoleAdmin:
		groups, total, err := h.svc.Group.List(r.Context(), r.URL.Query().Get("status"), p)
		if err != nil {
			fail(w, err)
			return
		}
		response.OK(w, paginated(groups, total, p))
	case models.RoleMentor:
		groups, total, err := h.svc.Group.ListByMentor(r.Context(), u.ID, p)
		if err != nil {
			fail(w, err)
			return
		}
		response.OK(w, paginated(groups, total, p))
	case models.RoleStudent:
		groups, err := h.svc.Academic.MyGroups(r.Context(), u.ID)
		if err != nil {
			fail(w, err)
			return
		}
		response.OK(w, paginated(groups, int64(len(groups)), p))
	default:
		response.Forbidden(w, "Sizda ruxsat yo'q")
	}
}

// CreateGroup (admin) creates a group.
func (h *Handlers) CreateGroup(w http.ResponseWriter, r *http.Request) {
	var in services.CreateGroupInput
	if !h.decode(w, r, &in) {
		return
	}
	g, err := h.svc.Group.Create(r.Context(), in)
	if err != nil {
		fail(w, err)
		return
	}
	response.Created(w, g)
}

// groupDetail bundles a group with its course, mentors and enrolled students.
type groupDetail struct {
	Group    *models.Group  `json:"group"`
	Course   *models.Course `json:"course"`
	Mentors  []models.User  `json:"mentors"`
	Students []studentEntry `json:"students"`
}

type studentEntry struct {
	User       models.User             `json:"user"`
	Enrollment models.Enrollment       `json:"enrollment"`
}

// GetGroup returns a group with detail (access-scoped).
func (h *Handlers) GetGroup(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	g, err := h.svc.Group.Get(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	if !h.canAccessGroup(r, g) {
		response.Forbidden(w, "Sizda ruxsat yo'q")
		return
	}

	detail := groupDetail{Group: g, Mentors: []models.User{}, Students: []studentEntry{}}
	if c, err := h.svc.Course.Get(r.Context(), g.CourseID); err == nil {
		detail.Course = c
	}
	for _, mid := range g.MentorIDs {
		if m, err := h.svc.User.Get(r.Context(), mid); err == nil {
			detail.Mentors = append(detail.Mentors, *m)
		}
	}
	enrolls, err := h.svc.Group.ListEnrollments(r.Context(), g.ID)
	if err == nil {
		for _, e := range enrolls {
			if s, err := h.svc.User.Get(r.Context(), e.StudentID); err == nil {
				detail.Students = append(detail.Students, studentEntry{User: *s, Enrollment: e})
			}
		}
	}
	response.OK(w, detail)
}

// UpdateGroup (admin) updates a group.
func (h *Handlers) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var in services.UpdateGroupInput
	if !h.decode(w, r, &in) {
		return
	}
	g, err := h.svc.Group.Update(r.Context(), id, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, g)
}

// DeleteGroup (admin) deletes a group.
func (h *Handlers) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	if err := h.svc.Group.Delete(r.Context(), id); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}

type setMentorsRequest struct {
	MentorIDs []string `json:"mentorIds" validate:"required"`
}

// SetGroupMentors (admin) replaces a group's mentors.
func (h *Handlers) SetGroupMentors(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var req setMentorsRequest
	if !h.decode(w, r, &req) {
		return
	}
	g, err := h.svc.Group.SetMentors(r.Context(), id, req.MentorIDs)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, g)
}

type addStudentRequest struct {
	StudentID string `json:"studentId" validate:"required"`
}

// AddGroupStudent (admin) enrolls a student (validates duplicate + schedule clash).
func (h *Handlers) AddGroupStudent(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var req addStudentRequest
	if !h.decode(w, r, &req) {
		return
	}
	sid, err := primitive.ObjectIDFromHex(req.StudentID)
	if err != nil {
		response.BadRequest(w, "Yaroqsiz o'quvchi identifikatori")
		return
	}
	e, err := h.svc.Group.AddStudent(r.Context(), id, sid)
	if err != nil {
		fail(w, err)
		return
	}
	response.Created(w, e)
}

// RemoveGroupStudent (admin) removes a student from a group.
func (h *Handlers) RemoveGroupStudent(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	sid, err := idParam(r, "sid")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz o'quvchi identifikatori")
		return
	}
	if err := h.svc.Group.RemoveStudent(r.Context(), id, sid); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}

// GroupRating returns the per-group student rating (access-scoped).
func (h *Handlers) GroupRating(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	g, err := h.svc.Group.Get(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	if !h.canAccessGroup(r, g) {
		response.Forbidden(w, "Sizda ruxsat yo'q")
		return
	}
	rows, err := h.svc.Rating.GroupRating(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, rows)
}
