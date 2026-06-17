package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// EnrollmentStatus enumerates enrollment states.
type EnrollmentStatus string

const (
	EnrollmentActive EnrollmentStatus = "active"
	EnrollmentLeft   EnrollmentStatus = "left"
)

// Enrollment links a student to a group.
type Enrollment struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	StudentID primitive.ObjectID `bson:"studentId" json:"studentId"`
	GroupID   primitive.ObjectID `bson:"groupId" json:"groupId"`
	JoinedAt  time.Time          `bson:"joinedAt" json:"joinedAt"`
	LeftAt    *time.Time         `bson:"leftAt,omitempty" json:"leftAt,omitempty"`
	Status    EnrollmentStatus   `bson:"status" json:"status"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}
