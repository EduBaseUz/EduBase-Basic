package services

import (
	"context"
	"errors"
	"strings"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"edubase/backend/internal/repositories/mongo"
	"edubase/backend/pkg/hash"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserService manages user accounts (admin-only operations).
type UserService struct {
	users repositories.UserRepository
}

func NewUserService(users repositories.UserRepository) *UserService {
	return &UserService{users: users}
}

// CreateUserInput is the payload for creating a user.
type CreateUserInput struct {
	Role           string  `json:"role" validate:"required,oneof=mentor student parent"`
	LastName       string  `json:"lastName" validate:"required,min=1"`
	FirstName      string  `json:"firstName" validate:"required,min=1"`
	MiddleName     string  `json:"middleName"`
	Phone           string   `json:"phone" validate:"required,min=5"`
	Address         string   `json:"address"`
	NoteCourseID    *string  `json:"noteCourseId"`
	Specialization  string   `json:"specialization"`
	Specializations []string `json:"specializations"`
}

// UpdateUserInput is the payload for updating a user.
type UpdateUserInput struct {
	LastName        *string   `json:"lastName"`
	FirstName       *string   `json:"firstName"`
	MiddleName      *string   `json:"middleName"`
	FullName        *string   `json:"fullName"`
	Phone           *string   `json:"phone"`
	Address         *string   `json:"address"`
	Status          *string   `json:"status" validate:"omitempty,oneof=active inactive"`
	NoteCourseID    *string   `json:"noteCourseId"`
	Specialization  *string   `json:"specialization"`
	Specializations *[]string `json:"specializations"`
}

// composeFullName builds a display name from parts (Familiya Ism Sharif).
func composeFullName(last, first, middle string) string {
	parts := []string{}
	for _, p := range []string{last, first, middle} {
		if t := strings.TrimSpace(p); t != "" {
			parts = append(parts, t)
		}
	}
	return strings.Join(parts, " ")
}

// cleanStrings trims and drops empty/duplicate entries.
func cleanStrings(in []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, s := range in {
		t := strings.TrimSpace(s)
		if t == "" || seen[t] {
			continue
		}
		seen[t] = true
		out = append(out, t)
	}
	return out
}

// Create makes a new user. Initial password is the phone number; mustChangePassword=true.
// Admins cannot be created through this path (only via seed).
func (s *UserService) Create(ctx context.Context, in CreateUserInput) (*models.User, error) {
	role := models.Role(in.Role)
	if role == models.RoleAdmin {
		return nil, Forbidden("Admin hisoblari faqat tizim tomonidan yaratiladi")
	}
	phone := strings.TrimSpace(in.Phone)
	exists, err := s.users.PhoneExists(ctx, phone, nil)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, Conflict("Bu telefon raqami allaqachon ro'yxatdan o'tgan")
	}

	hashed, err := hash.Password(phone) // initial password == phone
	if err != nil {
		return nil, err
	}

	u := &models.User{
		Role:               role,
		LastName:           strings.TrimSpace(in.LastName),
		FirstName:          strings.TrimSpace(in.FirstName),
		MiddleName:         strings.TrimSpace(in.MiddleName),
		FullName:           composeFullName(in.LastName, in.FirstName, in.MiddleName),
		Phone:              phone,
		Address:            strings.TrimSpace(in.Address),
		PasswordHash:       hashed,
		MustChangePassword: true,
		Status:             models.UserActive,
	}
	if role == models.RoleStudent && in.NoteCourseID != nil && *in.NoteCourseID != "" {
		id, err := primitive.ObjectIDFromHex(*in.NoteCourseID)
		if err != nil {
			return nil, BadRequest("Yaroqsiz kurs identifikatori")
		}
		u.NoteCourseID = &id
	}
	if role == models.RoleMentor {
		u.Specializations = cleanStrings(in.Specializations)
		if len(u.Specializations) == 0 && in.Specialization != "" {
			u.Specializations = []string{strings.TrimSpace(in.Specialization)}
		}
		u.Specialization = strings.Join(u.Specializations, ", ")
	}

	if err := s.users.Create(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

// Get returns a user by id.
func (s *UserService) Get(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	u, err := s.users.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("Foydalanuvchi topilmadi")
		}
		return nil, err
	}
	return u, nil
}

// List returns a paginated list of users.
func (s *UserService) List(ctx context.Context, f repositories.UserFilter, p repositories.Page) ([]models.User, int64, error) {
	return s.users.List(ctx, f, p)
}

// Update modifies a user's editable fields.
func (s *UserService) Update(ctx context.Context, id primitive.ObjectID, in UpdateUserInput) (*models.User, error) {
	u, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	nameChanged := false
	if in.LastName != nil {
		u.LastName = strings.TrimSpace(*in.LastName)
		nameChanged = true
	}
	if in.FirstName != nil {
		u.FirstName = strings.TrimSpace(*in.FirstName)
		nameChanged = true
	}
	if in.MiddleName != nil {
		u.MiddleName = strings.TrimSpace(*in.MiddleName)
		nameChanged = true
	}
	if nameChanged {
		u.FullName = composeFullName(u.LastName, u.FirstName, u.MiddleName)
	}
	if in.FullName != nil {
		u.FullName = strings.TrimSpace(*in.FullName)
	}
	if in.Phone != nil {
		phone := strings.TrimSpace(*in.Phone)
		exists, err := s.users.PhoneExists(ctx, phone, &id)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, Conflict("Bu telefon raqami allaqachon band")
		}
		u.Phone = phone
	}
	if in.Address != nil {
		u.Address = strings.TrimSpace(*in.Address)
	}
	if in.Status != nil {
		u.Status = models.UserStatus(*in.Status)
	}
	if u.Role == models.RoleMentor {
		if in.Specializations != nil {
			u.Specializations = cleanStrings(*in.Specializations)
			u.Specialization = strings.Join(u.Specializations, ", ")
		} else if in.Specialization != nil {
			u.Specialization = strings.TrimSpace(*in.Specialization)
			u.Specializations = []string{u.Specialization}
		}
	}
	if in.NoteCourseID != nil && u.Role == models.RoleStudent {
		if *in.NoteCourseID == "" {
			u.NoteCourseID = nil
		} else {
			cid, err := primitive.ObjectIDFromHex(*in.NoteCourseID)
			if err != nil {
				return nil, BadRequest("Yaroqsiz kurs identifikatori")
			}
			u.NoteCourseID = &cid
		}
	}
	if err := s.users.Update(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

// Delete removes a user.
func (s *UserService) Delete(ctx context.Context, id primitive.ObjectID) error {
	u, err := s.Get(ctx, id)
	if err != nil {
		return err
	}
	if u.Role == models.RoleAdmin {
		return Forbidden("Admin hisobini o'chirib bo'lmaydi")
	}
	return s.users.Delete(ctx, id)
}

// ResetPassword sets a user's password back to their phone and forces a change.
func (s *UserService) ResetPassword(ctx context.Context, id primitive.ObjectID) error {
	u, err := s.Get(ctx, id)
	if err != nil {
		return err
	}
	hashed, err := hash.Password(u.Phone)
	if err != nil {
		return err
	}
	u.PasswordHash = hashed
	u.MustChangePassword = true
	return s.users.Update(ctx, u)
}

// UpdateOwnProfile lets any user edit their own profile fields.
func (s *UserService) UpdateOwnProfile(ctx context.Context, id primitive.ObjectID, in UpdateUserInput) (*models.User, error) {
	// Reuse Update but never allow self status or specialization changes here
	// (mentor specialization is managed by admin only).
	in.Status = nil
	in.Specialization = nil
	in.Specializations = nil
	return s.Update(ctx, id, in)
}

// AssignParent links a student to a parent (a student has at most one parent).
// Pass an empty parentID hex to detach.
func (s *UserService) AssignParent(ctx context.Context, studentID primitive.ObjectID, parentHex string) (*models.User, error) {
	student, err := s.Get(ctx, studentID)
	if err != nil {
		return nil, err
	}
	if student.Role != models.RoleStudent {
		return nil, BadRequest("Faqat talabaga ota-ona biriktiriladi")
	}
	if parentHex == "" {
		student.ParentID = nil
	} else {
		pid, err := primitive.ObjectIDFromHex(parentHex)
		if err != nil {
			return nil, BadRequest("Yaroqsiz ota-ona identifikatori")
		}
		parent, err := s.Get(ctx, pid)
		if err != nil {
			return nil, err
		}
		if parent.Role != models.RoleParent {
			return nil, BadRequest("Tanlangan foydalanuvchi ota-ona emas")
		}
		student.ParentID = &pid
	}
	if err := s.users.Update(ctx, student); err != nil {
		return nil, err
	}
	return student, nil
}

// SetChildren replaces the set of students linked to a parent.
func (s *UserService) SetChildren(ctx context.Context, parentID primitive.ObjectID, studentHexes []string) error {
	parent, err := s.Get(ctx, parentID)
	if err != nil {
		return err
	}
	if parent.Role != models.RoleParent {
		return BadRequest("Faqat ota-onaga farzand biriktiriladi")
	}

	desired := map[primitive.ObjectID]bool{}
	for _, h := range studentHexes {
		sid, err := primitive.ObjectIDFromHex(h)
		if err != nil {
			return BadRequest("Yaroqsiz talaba identifikatori")
		}
		desired[sid] = true
	}

	// Detach students who currently belong to this parent but are not desired.
	current, err := s.users.ListByParent(ctx, parentID)
	if err != nil {
		return err
	}
	for _, c := range current {
		if !desired[c.ID] {
			c.ParentID = nil
			if err := s.users.Update(ctx, &c); err != nil {
				return err
			}
		}
	}

	// Attach desired students to this parent.
	for sid := range desired {
		student, err := s.Get(ctx, sid)
		if err != nil {
			return err
		}
		if student.Role != models.RoleStudent {
			return BadRequest("Faqat talabani biriktirish mumkin")
		}
		pid := parentID
		student.ParentID = &pid
		if err := s.users.Update(ctx, student); err != nil {
			return err
		}
	}
	return nil
}

// ListChildren returns the students linked to a parent.
func (s *UserService) ListChildren(ctx context.Context, parentID primitive.ObjectID) ([]models.User, error) {
	return s.users.ListByParent(ctx, parentID)
}
