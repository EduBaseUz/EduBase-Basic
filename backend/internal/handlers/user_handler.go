package handlers

import (
	"net/http"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"edubase/backend/internal/services"
	"edubase/backend/pkg/response"
)

// ListUsers (admin) returns a paginated user list.
func (h *Handlers) ListUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := repositories.UserFilter{
		Role:   q.Get("role"),
		Status: q.Get("status"),
		Search: q.Get("search"),
	}
	p := pageFrom(r)
	users, total, err := h.svc.User.List(r.Context(), f, p)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, paginated(users, total, p))
}

// CreateUser (admin) creates a mentor/student/parent.
func (h *Handlers) CreateUser(w http.ResponseWriter, r *http.Request) {
	var in services.CreateUserInput
	if !h.decode(w, r, &in) {
		return
	}
	u, err := h.svc.User.Create(r.Context(), in)
	if err != nil {
		fail(w, err)
		return
	}
	response.Created(w, u)
}

// GetUser (admin) returns a single user.
func (h *Handlers) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	u, err := h.svc.User.Get(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, u)
}

// UpdateUser (admin) updates a user.
func (h *Handlers) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var in services.UpdateUserInput
	if !h.decode(w, r, &in) {
		return
	}
	u, err := h.svc.User.Update(r.Context(), id, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, u)
}

// DeleteUser (admin) deletes a user.
func (h *Handlers) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	if err := h.svc.User.Delete(r.Context(), id); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}

type assignParentRequest struct {
	ParentID string `json:"parentId"`
}

// AssignParent (admin) links a student to a parent (empty -> detach).
func (h *Handlers) AssignParent(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var req assignParentRequest
	if !h.decode(w, r, &req) {
		return
	}
	u, err := h.svc.User.AssignParent(r.Context(), id, req.ParentID)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, u)
}

type setChildrenRequest struct {
	StudentIDs []string `json:"studentIds"`
}

// SetChildren (admin) replaces the students linked to a parent.
func (h *Handlers) SetChildren(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var req setChildrenRequest
	if !h.decode(w, r, &req) {
		return
	}
	if err := h.svc.User.SetChildren(r.Context(), id, req.StudentIDs); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}

// UserDetail (admin) returns a user with role-specific related data.
func (h *Handlers) UserDetail(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	u, err := h.svc.User.Get(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}

	detail := map[string]any{"user": u}
	bigPage := repositories.Page{Page: 1, Limit: 1000}

	switch u.Role {
	case models.RoleMentor:
		groups, _, _ := h.svc.Group.ListByMentor(r.Context(), id, bigPage)
		detail["groups"] = groups
		_, _ = h.svc.Payout.SyncPayout(r.Context(), id, currentPeriod())
		payouts, _ := h.svc.Payout.ListByMentor(r.Context(), id)
		detail["payouts"] = payouts
	case models.RoleStudent:
		groups, _ := h.svc.Academic.MyGroups(r.Context(), id)
		detail["groups"] = groups
		tuition, _ := h.svc.Tuition.ListByStudent(r.Context(), id)
		detail["tuition"] = tuition
		if u.ParentID != nil {
			if parent, err := h.svc.User.Get(r.Context(), *u.ParentID); err == nil {
				detail["parent"] = parent
			}
		}
	case models.RoleParent:
		children, _ := h.svc.User.ListChildren(r.Context(), id)
		detail["children"] = children
	}

	response.OK(w, detail)
}

// ResetUserPassword (admin) resets a user's password to their phone.
func (h *Handlers) ResetUserPassword(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	if err := h.svc.User.ResetPassword(r.Context(), id); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}
