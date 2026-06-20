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

// EnrollmentOutcome records WHY an enrollment ended — preserved as history so a
// student's full path through groups can always be reconstructed.
type EnrollmentOutcome string

const (
	OutcomeNone        EnrollmentOutcome = ""            // hali davom etmoqda
	OutcomePassed      EnrollmentOutcome = "passed"      // sinovdan o'tdi -> keyingi guruh
	OutcomeRepeat      EnrollmentOutcome = "repeat"      // yiqildi -> qayta o'qiydi
	OutcomeTransferred EnrollmentOutcome = "transferred" // oddiy ko'chirish
	OutcomeDropped     EnrollmentOutcome = "dropped"     // guruhdan chiqarildi
)

// Enrollment links a student to a group. Records are append-only history: when a
// student leaves, the row is closed (Status=left) rather than deleted.
type Enrollment struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	StudentID primitive.ObjectID `bson:"studentId" json:"studentId"`
	GroupID   primitive.ObjectID `bson:"groupId" json:"groupId"`
	JoinedAt  time.Time          `bson:"joinedAt" json:"joinedAt"`
	LeftAt    *time.Time         `bson:"leftAt,omitempty" json:"leftAt,omitempty"`
	Status    EnrollmentStatus   `bson:"status" json:"status"`
	Outcome   EnrollmentOutcome  `bson:"outcome,omitempty" json:"outcome,omitempty"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}
