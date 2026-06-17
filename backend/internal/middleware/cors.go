package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

// CORS restricts cross-origin requests to the configured frontend origin,
// allowing credentials (cookies).
func CORS(frontendOrigin string) func(http.Handler) http.Handler {
	return cors.Handler(cors.Options{
		AllowedOrigins:   []string{frontendOrigin},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}
