package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Role enumerates the system roles.
type Role string

const (
	RoleAdmin   Role = "admin"
	RoleMentor  Role = "mentor"
	RoleStudent Role = "student"
	RoleParent  Role = "parent" // future use; data model only
)

// UserStatus enumerates account states.
type UserStatus string

const (
	UserActive   UserStatus = "active"
	UserInactive UserStatus = "inactive"
)

// User is an account in the system. Login is by phone.
type User struct {
	ID                 primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Role               Role                `bson:"role" json:"role"`
	LastName           string              `bson:"lastName,omitempty" json:"lastName,omitempty"`    // Familiya
	FirstName          string              `bson:"firstName,omitempty" json:"firstName,omitempty"`  // Ism
	MiddleName         string              `bson:"middleName,omitempty" json:"middleName,omitempty"` // Sharif
	FullName           string              `bson:"fullName" json:"fullName"`
	Phone              string              `bson:"phone" json:"phone"`
	Address            string              `bson:"address,omitempty" json:"address,omitempty"`
	PasswordHash       string              `bson:"passwordHash" json:"-"`
	MustChangePassword bool                `bson:"mustChangePassword" json:"mustChangePassword"`
	Status             UserStatus          `bson:"status" json:"status"`
	NoteCourseID       *primitive.ObjectID `bson:"noteCourseId,omitempty" json:"noteCourseId,omitempty"` // student informational tag
	Specialization     string              `bson:"specialization,omitempty" json:"specialization,omitempty"` // deprecated: use Specializations
	Specializations    []string            `bson:"specializations,omitempty" json:"specializations,omitempty"` // mentor: multiple
	ParentID           *primitive.ObjectID `bson:"parentId,omitempty" json:"parentId,omitempty"` // student -> parent
	CreatedAt          time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time           `bson:"updatedAt" json:"updatedAt"`
}
