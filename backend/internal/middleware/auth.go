package middleware

import (
	"net/http"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"edubase/backend/pkg/jwt"
	"edubase/backend/pkg/response"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Auth validates the access cookie, loads the user, and stores it on the context.
func Auth(jwtMgr *jwt.Manager, users repositories.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(AccessCookie)
			if err != nil || cookie.Value == "" {
				response.Unauthorized(w, "Avtorizatsiya talab qilinadi")
				return
			}
			claims, err := jwtMgr.Verify(cookie.Value, jwt.Access)
			if err != nil {
				response.Unauthorized(w, "Sessiya muddati tugagan")
				return
			}
			id, err := primitive.ObjectIDFromHex(claims.UserID)
			if err != nil {
				response.Unauthorized(w, "Yaroqsiz token")
				return
			}
			u, err := users.GetByID(r.Context(), id)
			if err != nil {
				response.Unauthorized(w, "Foydalanuvchi topilmadi")
				return
			}
			if u.Status != models.UserActive {
				response.Forbidden(w, "Hisob faol emas")
				return
			}
			ctx := WithUser(r.Context(), u)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequirePasswordChanged blocks users who must change their password from
// reaching protected resources (apply to everything except change-password).
func RequirePasswordChanged(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := UserFrom(r.Context())
		if !ok {
			response.Unauthorized(w, "Avtorizatsiya talab qilinadi")
			return
		}
		if u.MustChangePassword {
			response.Error(w, http.StatusForbidden, "password_change_required", "Avval parolni o'zgartiring")
			return
		}
		next.ServeHTTP(w, r)
	})
}
