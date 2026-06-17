package jwt

import (
	"errors"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

// TokenType distinguishes access from refresh tokens.
type TokenType string

const (
	Access  TokenType = "access"
	Refresh TokenType = "refresh"
)

// Claims is the JWT payload carried in cookies.
type Claims struct {
	UserID string    `json:"userId"`
	Role   string    `json:"role"`
	Type   TokenType `json:"type"`
	jwtlib.RegisteredClaims
}

// Manager signs and verifies access/refresh tokens.
type Manager struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewManager(accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *Manager {
	return &Manager{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

func (m *Manager) AccessTTL() time.Duration  { return m.accessTTL }
func (m *Manager) RefreshTTL() time.Duration { return m.refreshTTL }

// Generate creates a signed token of the given type.
func (m *Manager) Generate(userID, role string, t TokenType) (string, error) {
	var secret []byte
	var ttl time.Duration
	switch t {
	case Access:
		secret, ttl = m.accessSecret, m.accessTTL
	case Refresh:
		secret, ttl = m.refreshSecret, m.refreshTTL
	default:
		return "", errors.New("unknown token type")
	}

	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		Type:   t,
		RegisteredClaims: jwtlib.RegisteredClaims{
			IssuedAt:  jwtlib.NewNumericDate(now),
			ExpiresAt: jwtlib.NewNumericDate(now.Add(ttl)),
			Subject:   userID,
		},
	}
	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

// Verify parses and validates a token of the given type.
func (m *Manager) Verify(tokenStr string, t TokenType) (*Claims, error) {
	var secret []byte
	switch t {
	case Access:
		secret = m.accessSecret
	case Refresh:
		secret = m.refreshSecret
	default:
		return nil, errors.New("unknown token type")
	}

	claims := &Claims{}
	token, err := jwtlib.ParseWithClaims(tokenStr, claims, func(token *jwtlib.Token) (any, error) {
		if _, ok := token.Method.(*jwtlib.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid || claims.Type != t {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
