package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"edubase/backend/internal/config"
	"edubase/backend/internal/middleware"
	"edubase/backend/internal/repositories"
	"edubase/backend/internal/services"
	"edubase/backend/pkg/jwt"
	"edubase/backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Handlers is the transport layer bundling services and shared dependencies.
type Handlers struct {
	svc      *services.Services
	jwt      *jwt.Manager
	cfg      *config.Config
	validate *validator.Validate
}

func New(svc *services.Services, jwtMgr *jwt.Manager, cfg *config.Config) *Handlers {
	return &Handlers{
		svc:      svc,
		jwt:      jwtMgr,
		cfg:      cfg,
		validate: validator.New(),
	}
}

// decode reads and validates a JSON body into dst.
func (h *Handlers) decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		response.BadRequest(w, "So'rov formati noto'g'ri")
		return false
	}
	if err := h.validate.Struct(dst); err != nil {
		response.Validation(w, "Kiritilgan ma'lumotlar noto'g'ri")
		return false
	}
	return true
}

// fail maps a service error to the proper HTTP response.
func fail(w http.ResponseWriter, err error) {
	var se *services.Error
	if errors.As(err, &se) {
		switch se.Kind {
		case services.KindBadRequest:
			response.BadRequest(w, se.Message)
		case services.KindUnauthorized:
			response.Unauthorized(w, se.Message)
		case services.KindForbidden:
			response.Forbidden(w, se.Message)
		case services.KindNotFound:
			response.NotFound(w, se.Message)
		case services.KindConflict:
			response.Conflict(w, se.Message)
		case services.KindValidation:
			response.Validation(w, se.Message)
		default:
			response.Internal(w, err)
		}
		return
	}
	response.Internal(w, err)
}

// idParam parses an ObjectID from a URL path parameter.
func idParam(r *http.Request, name string) (primitive.ObjectID, error) {
	return primitive.ObjectIDFromHex(chi.URLParam(r, name))
}

// pageFrom reads page/limit query params.
func pageFrom(r *http.Request) repositories.Page {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	p := repositories.Page{Page: page, Limit: limit}
	p.Normalize()
	return p
}

// listResult is the standard paginated list envelope payload.
type listResult struct {
	Items any   `json:"items"`
	Total int64 `json:"total"`
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
}

func paginated(items any, total int64, p repositories.Page) listResult {
	return listResult{Items: items, Total: total, Page: p.Page, Limit: p.Limit}
}

// --- auth cookies ---

func (h *Handlers) setAuthCookies(w http.ResponseWriter, pair *services.TokenPair) {
	h.setCookie(w, middleware.AccessCookie, pair.Access, h.jwt.AccessTTL())
	h.setCookie(w, middleware.RefreshCookie, pair.Refresh, h.jwt.RefreshTTL())
}

func (h *Handlers) clearAuthCookies(w http.ResponseWriter) {
	h.setCookie(w, middleware.AccessCookie, "", -time.Hour)
	h.setCookie(w, middleware.RefreshCookie, "", -time.Hour)
}

func (h *Handlers) setCookie(w http.ResponseWriter, name, value string, ttl time.Duration) {
	secure := h.cfg.FrontendOrigin != "" && len(h.cfg.FrontendOrigin) >= 5 && h.cfg.FrontendOrigin[:5] == "https"
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		Domain:   h.cfg.CookieDomain, // bo'sh bo'lsa joriy host; prod'da ".edubase.uz"
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(ttl),
		MaxAge:   int(ttl.Seconds()),
	})
}
