package handlers

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"

	"edubase/backend/internal/middleware"
	"edubase/backend/pkg/response"
	"github.com/gabriel-vasile/mimetype"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// maxAvatarSize is the maximum allowed avatar upload size (5 MB).
const maxAvatarSize = 5 << 20

// allowedAvatarTypes maps accepted image MIME types to a file extension.
var allowedAvatarTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// readAvatarFile parses and validates an "avatar" multipart image from the
// request. On success it returns a rewound file (caller must Close it), its MIME
// type and a matching extension. On failure it writes the error response and
// returns ok=false.
func (h *Handlers) readAvatarFile(
	w http.ResponseWriter,
	r *http.Request,
) (multipart.File, string, string, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarSize+(1<<20))
	if err := r.ParseMultipartForm(maxAvatarSize); err != nil {
		response.BadRequest(w, "Fayl juda katta (maksimum 5MB) yoki so'rov noto'g'ri")
		return nil, "", "", false
	}

	file, hdr, err := r.FormFile("avatar")
	if err != nil {
		response.BadRequest(w, "Rasm fayli topilmadi (\"avatar\" maydoni kerak)")
		return nil, "", "", false
	}

	if hdr.Size > maxAvatarSize {
		file.Close()
		response.BadRequest(w, "Fayl hajmi 5MB dan oshmasligi kerak")
		return nil, "", "", false
	}

	mtype, err := mimetype.DetectReader(file)
	if err != nil {
		file.Close()
		response.BadRequest(w, "Fayl turini aniqlab bo'lmadi")
		return nil, "", "", false
	}
	ext, ok := allowedAvatarTypes[mtype.String()]
	if !ok {
		file.Close()
		response.BadRequest(w, "Faqat rasm yuklash mumkin (JPG, PNG yoki WEBP)")
		return nil, "", "", false
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		file.Close()
		response.Internal(w, err)
		return nil, "", "", false
	}
	return file, mtype.String(), ext, true
}

// UploadMyAvatar lets the authenticated user upload their own avatar.
// POST /api/v1/me/avatar  (multipart/form-data, field: "avatar")
func (h *Handlers) UploadMyAvatar(w http.ResponseWriter, r *http.Request) {
	u := middleware.MustUser(r.Context())
	h.handleAvatarUpload(w, r, u.ID)
}

// UploadUserAvatar lets an admin set any user's avatar (e.g. when adding a student).
// POST /api/v1/users/{id}/avatar  (multipart/form-data, field: "avatar")
func (h *Handlers) UploadUserAvatar(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	h.handleAvatarUpload(w, r, id)
}

// handleAvatarUpload uploads a validated image to S3, persists the URL on the
// user, and removes the previous avatar object (best-effort).
func (h *Handlers) handleAvatarUpload(w http.ResponseWriter, r *http.Request, userID primitive.ObjectID) {
	if h.storage == nil {
		response.Internal(w, errors.New("S3 sozlanmagan: AWS_S3_BUCKET ni tekshiring"))
		return
	}

	file, contentType, ext, ok := h.readAvatarFile(w, r)
	if !ok {
		return
	}
	defer file.Close()

	// Key: avatars/<userID>/<random>.<ext> — collision-free per upload.
	key := fmt.Sprintf("avatars/%s/%s%s", userID.Hex(), primitive.NewObjectID().Hex(), ext)

	url, err := h.storage.Upload(r.Context(), key, file, contentType)
	if err != nil {
		response.Internal(w, err)
		return
	}

	updated, oldKey, err := h.svc.User.SetAvatar(r.Context(), userID, url, key)
	if err != nil {
		// Rollback the just-uploaded object so we don't leak orphans.
		_ = h.storage.Delete(r.Context(), key)
		fail(w, err)
		return
	}

	// Remove the previous avatar — but only if the user owned it (own uploads
	// have a key; default-library avatars are shared and stored URL-only).
	if oldKey != "" && oldKey != key {
		_ = h.storage.Delete(r.Context(), oldKey)
	}

	response.OK(w, updated)
}
