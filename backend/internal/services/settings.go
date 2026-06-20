package services

import (
	"context"
	"errors"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"edubase/backend/internal/repositories/mongo"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SettingsService manages system-wide settings such as the default avatar
// library used when creating users without an explicit avatar.
type SettingsService struct {
	defaultAvatars repositories.DefaultAvatarRepository
}

func NewSettingsService(defaultAvatars repositories.DefaultAvatarRepository) *SettingsService {
	return &SettingsService{defaultAvatars: defaultAvatars}
}

// ListAvatars returns the full default-avatar library.
func (s *SettingsService) ListAvatars(ctx context.Context) ([]models.DefaultAvatar, error) {
	return s.defaultAvatars.List(ctx)
}

// AddAvatar registers a newly uploaded default avatar for the given gender
// ("male", "female" or "both").
func (s *SettingsService) AddAvatar(ctx context.Context, url, key, gender string) (*models.DefaultAvatar, error) {
	a := &models.DefaultAvatar{URL: url, Key: key, Gender: gender}
	if err := s.defaultAvatars.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

// DeleteAvatar removes a default avatar from the library and returns its S3 key
// so the caller can delete the underlying object.
func (s *SettingsService) DeleteAvatar(ctx context.Context, id primitive.ObjectID) (string, error) {
	a, err := s.defaultAvatars.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return "", NotFound("Rasm topilmadi")
		}
		return "", err
	}
	if err := s.defaultAvatars.Delete(ctx, id); err != nil {
		return "", err
	}
	return a.Key, nil
}
