package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// LessonStatus enumerates lesson states.
type LessonStatus string

const (
	LessonDone      LessonStatus = "done"
	LessonCancelled LessonStatus = "cancelled"
)

// Lesson is a single class session created by a mentor. Pricing values are
// snapshotted at creation so later rate changes never alter historical money.
type Lesson struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	GroupID            primitive.ObjectID `bson:"groupId" json:"groupId"`
	ConductedByMentorID primitive.ObjectID `bson:"conductedByMentorId" json:"conductedByMentorId"`
	Date               time.Time          `bson:"date" json:"date"`
	Topic              string             `bson:"topic" json:"topic"`
	MonthIndex         int                `bson:"monthIndex" json:"monthIndex"`
	StudentLessonPrice int64              `bson:"studentLessonPrice" json:"studentLessonPrice"` // snapshot
	MentorRateSnapshot int64              `bson:"mentorRateSnapshot" json:"mentorRateSnapshot"` // snapshot
	Status             LessonStatus       `bson:"status" json:"status"`
	CreatedAt          time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// Homework attached to a lesson.
type Homework struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	LessonID    primitive.ObjectID `bson:"lessonId" json:"lessonId"`
	GroupID     primitive.ObjectID `bson:"groupId" json:"groupId"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// AttendanceStatus enumerates the four attendance states.
type AttendanceStatus string

const (
	AttPresent AttendanceStatus = "present"
	AttLate    AttendanceStatus = "late"
	AttExcused AttendanceStatus = "excused"
	AttAbsent  AttendanceStatus = "absent"
)

// Billable reports whether this status causes a student to be charged and counts
// toward mentor salary (present or late).
func (a AttendanceStatus) Billable() bool {
	return a == AttPresent || a == AttLate
}

// Attendance records a student's presence at a lesson.
type Attendance struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	LessonID  primitive.ObjectID `bson:"lessonId" json:"lessonId"`
	StudentID primitive.ObjectID `bson:"studentId" json:"studentId"`
	GroupID   primitive.ObjectID `bson:"groupId" json:"groupId"`
	Status    AttendanceStatus   `bson:"status" json:"status"`
	MarkedBy  primitive.ObjectID `bson:"markedBy" json:"markedBy"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// GradeType enumerates the two grade categories.
type GradeType string

const (
	GradeHomework      GradeType = "homework"
	GradeParticipation GradeType = "participation"
)

// Grade is a 1-10 integer score for a student in a lesson.
type Grade struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	LessonID  primitive.ObjectID `bson:"lessonId" json:"lessonId"`
	StudentID primitive.ObjectID `bson:"studentId" json:"studentId"`
	GroupID   primitive.ObjectID `bson:"groupId" json:"groupId"`
	Type      GradeType          `bson:"type" json:"type"`
	Score     int                `bson:"score" json:"score"`
	GradedBy  primitive.ObjectID `bson:"gradedBy" json:"gradedBy"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}
