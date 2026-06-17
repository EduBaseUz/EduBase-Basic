package services

import (
	"context"
	"errors"
	"unicode"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"edubase/backend/internal/repositories/mongo"
	"edubase/backend/pkg/hash"
	"edubase/backend/pkg/jwt"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuthService handles login, password changes and token refresh.
type AuthService struct {
	users repositories.UserRepository
	jwt   *jwt.Manager
}

func NewAuthService(users repositories.UserRepository, jwtMgr *jwt.Manager) *AuthService {
	return &AuthService{users: users, jwt: jwtMgr}
}

// TokenPair bundles signed access and refresh tokens.
type TokenPair struct {
	Access  string
	Refresh string
}

// Login verifies credentials and returns tokens plus the user.
func (s *AuthService) Login(ctx context.Context, phone, password string) (*models.User, *TokenPair, error) {
	u, err := s.users.GetByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, nil, Unauthorized("Telefon raqami yoki parol noto'g'ri")
		}
		return nil, nil, err
	}
	if u.Status != models.UserActive {
		return nil, nil, Forbidden("Hisob faol emas")
	}
	if !hash.Check(u.PasswordHash, password) {
		return nil, nil, Unauthorized("Telefon raqami yoki parol noto'g'ri")
	}

	pair, err := s.issueTokens(u)
	if err != nil {
		return nil, nil, err
	}
	return u, pair, nil
}

// ChangePassword updates a user's password after validating the policy.
func (s *AuthService) ChangePassword(ctx context.Context, userID primitive.ObjectID, current, next string) error {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return NotFound("Foydalanuvchi topilmadi")
		}
		return err
	}
	// If not a forced change, require the current password.
	if !u.MustChangePassword {
		if !hash.Check(u.PasswordHash, current) {
			return Unauthorized("Joriy parol noto'g'ri")
		}
	}
	if err := ValidatePassword(next); err != nil {
		return err
	}
	hashed, err := hash.Password(next)
	if err != nil {
		return err
	}
	u.PasswordHash = hashed
	u.MustChangePassword = false
	return s.users.Update(ctx, u)
}

// Refresh validates a refresh token and issues a fresh token pair.
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*models.User, *TokenPair, error) {
	claims, err := s.jwt.Verify(refreshToken, jwt.Refresh)
	if err != nil {
		return nil, nil, Unauthorized("Sessiya muddati tugagan")
	}
	id, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return nil, nil, Unauthorized("Yaroqsiz token")
	}
	u, err := s.users.GetByID(ctx, id)
	if err != nil {
		return nil, nil, Unauthorized("Foydalanuvchi topilmadi")
	}
	if u.Status != models.UserActive {
		return nil, nil, Forbidden("Hisob faol emas")
	}
	pair, err := s.issueTokens(u)
	if err != nil {
		return nil, nil, err
	}
	return u, pair, nil
}

// Me returns the current user.
func (s *AuthService) Me(ctx context.Context, userID primitive.ObjectID) (*models.User, error) {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("Foydalanuvchi topilmadi")
		}
		return nil, err
	}
	return u, nil
}

func (s *AuthService) issueTokens(u *models.User) (*TokenPair, error) {
	access, err := s.jwt.Generate(u.ID.Hex(), string(u.Role), jwt.Access)
	if err != nil {
		return nil, err
	}
	refresh, err := s.jwt.Generate(u.ID.Hex(), string(u.Role), jwt.Refresh)
	if err != nil {
		return nil, err
	}
	return &TokenPair{Access: access, Refresh: refresh}, nil
}

// ValidatePassword enforces: min 8 chars, at least one upper and one lower letter.
func ValidatePassword(p string) error {
	if len(p) < 8 {
		return Validation("Parol kamida 8 ta belgidan iborat bo'lishi kerak")
	}
	var hasUpper, hasLower bool
	for _, r := range p {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		}
	}
	if !hasUpper || !hasLower {
		return Validation("Parolda kamida bitta katta va bitta kichik harf bo'lishi kerak")
	}
	return nil
}
