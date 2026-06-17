package middleware

import (
	"net/http"

	"edubase/backend/internal/models"
	"edubase/backend/pkg/response"
)

// RequireRole allows only users whose role is in the allowed set.
func RequireRole(roles ...models.Role) func(http.Handler) http.Handler {
	allowed := map[models.Role]bool{}
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, ok := UserFrom(r.Context())
			if !ok {
				response.Unauthorized(w, "Avtorizatsiya talab qilinadi")
				return
			}
			if !allowed[u.Role] {
				response.Forbidden(w, "Sizda ruxsat yo'q")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
