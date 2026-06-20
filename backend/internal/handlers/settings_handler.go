package handlers

import (
	"errors"
	"fmt"
	"net/http"

	"edubase/backend/pkg/response"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ListDefaultAvatars (admin) returns the default-avatar library.
// GET /api/v1/settings/avatars
func (h *Handlers) ListDefaultAvatars(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.Settings.ListAvatars(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, items)
}

// UploadDefaultAvatar (admin) adds an image to the default-avatar library.
// POST /api/v1/settings/avatars  (multipart/form-data, field: "avatar")
func (h *Handlers) UploadDefaultAvatar(w http.ResponseWriter, r *http.Request) {
	if h.storage == nil {
		response.Internal(w, errors.New("S3 sozlanmagan: AWS_S3_BUCKET ni tekshiring"))
		return
	}

	file, contentType, ext, ok := h.readAvatarFile(w, r)
	if !ok {
		return
	}
	defer file.Close()

	// Jins: male | female | both (ikkalasi).
	gender := r.FormValue("gender")
	switch gender {
	case "male", "female", "both":
		// ok
	default:
		response.BadRequest(w, "Jinsni tanlang (erkak, ayol yoki ikkalasi)")
		return
	}

	// Default avatarlarni ham "avatars/" prefiksi ostida saqlaymiz — shunda
	// mavjud public bucket policy (avatars/*) ularni ham qoplaydi.
	key := fmt.Sprintf("avatars/defaults/%s%s", primitive.NewObjectID().Hex(), ext)

	url, err := h.storage.Upload(r.Context(), key, file, contentType)
	if err != nil {
		response.Internal(w, err)
		return
	}

	created, err := h.svc.Settings.AddAvatar(r.Context(), url, key, gender)
	if err != nil {
		// Rollback so we don't leak an orphaned S3 object.
		_ = h.storage.Delete(r.Context(), key)
		fail(w, err)
		return
	}

	response.Created(w, created)
}

// DeleteDefaultAvatar (admin) removes an image from the library and deletes the
// underlying S3 object.
// DELETE /api/v1/settings/avatars/{id}
func (h *Handlers) DeleteDefaultAvatar(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}

	key, err := h.svc.Settings.DeleteAvatar(r.Context(), id)
	if err != nil {
		fail(w, err)
		return
	}

	if key != "" && h.storage != nil {
		_ = h.storage.Delete(r.Context(), key)
	}

	response.OK(w, map[string]bool{"deleted": true})
}
