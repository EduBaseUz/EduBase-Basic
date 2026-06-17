package middleware

import (
	"context"

	"edubase/backend/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ctxKey string

const (
	ctxUser ctxKey = "user"
)

// Cookie names for the auth tokens.
const (
	AccessCookie  = "edubase_access"
	RefreshCookie = "edubase_refresh"
)

// WithUser stores the authenticated user on the context.
func WithUser(ctx context.Context, u *models.User) context.Context {
	return context.WithValue(ctx, ctxUser, u)
}

// UserFrom returns the authenticated user from the context, if any.
func UserFrom(ctx context.Context) (*models.User, bool) {
	u, ok := ctx.Value(ctxUser).(*models.User)
	return u, ok
}

// MustUser returns the authenticated user (panics if missing — only use behind Auth).
func MustUser(ctx context.Context) *models.User {
	u, _ := UserFrom(ctx)
	return u
}

// UserID returns the authenticated user's id.
func UserID(ctx context.Context) primitive.ObjectID {
	if u, ok := UserFrom(ctx); ok {
		return u.ID
	}
	return primitive.NilObjectID
}
