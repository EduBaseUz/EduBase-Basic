package handlers

import (
	"net/http"

	"edubase/backend/internal/middleware"
	"edubase/backend/pkg/response"
)

type loginRequest struct {
	Phone    string `json:"phone" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword" validate:"required"`
}

// Login authenticates a user and sets auth cookies.
func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !h.decode(w, r, &req) {
		return
	}
	user, pair, err := h.svc.Auth.Login(r.Context(), req.Phone, req.Password)
	if err != nil {
		fail(w, err)
		return
	}
	h.setAuthCookies(w, pair)
	response.OK(w, map[string]any{
		"user":               user,
		"mustChangePassword": user.MustChangePassword,
	})
}

// ChangePassword updates the current user's password.
func (h *Handlers) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var req changePasswordRequest
	if !h.decode(w, r, &req) {
		return
	}
	uid := middleware.UserID(r.Context())
	if err := h.svc.Auth.ChangePassword(r.Context(), uid, req.CurrentPassword, req.NewPassword); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"ok": true})
}

// Refresh issues a new token pair from the refresh cookie.
func (h *Handlers) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(middleware.RefreshCookie)
	if err != nil || cookie.Value == "" {
		response.Unauthorized(w, "Sessiya topilmadi")
		return
	}
	user, pair, err := h.svc.Auth.Refresh(r.Context(), cookie.Value)
	if err != nil {
		h.clearAuthCookies(w)
		fail(w, err)
		return
	}
	h.setAuthCookies(w, pair)
	response.OK(w, map[string]any{"user": user})
}

// Logout clears the auth cookies.
func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	h.clearAuthCookies(w)
	response.OK(w, map[string]any{"ok": true})
}

// Me returns the authenticated user.
func (h *Handlers) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFrom(r.Context())
	if !ok {
		response.Unauthorized(w, "Avtorizatsiya talab qilinadi")
		return
	}
	response.OK(w, map[string]any{"user": user})
}
