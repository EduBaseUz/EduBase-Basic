package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Schedule is the display-only timetable of a group.
type Schedule struct {
	Days      []string `bson:"days" json:"days"` // e.g. ["mon","wed","fri"]
	StartTime string   `bson:"startTime" json:"startTime"` // "HH:MM"
	EndTime   string   `bson:"endTime" json:"endTime"`     // "HH:MM"
	Room      string   `bson:"room,omitempty" json:"room,omitempty"`
}

// GroupStatus enumerates group states.
type GroupStatus string

const (
	GroupActive   GroupStatus = "active"
	GroupFinished GroupStatus = "finished"
	GroupPaused   GroupStatus = "paused"
)

// Group is a cohort of students taking a course with one or more mentors.
type Group struct {
	ID           primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Name         string               `bson:"name" json:"name"`
	CourseID     primitive.ObjectID   `bson:"courseId" json:"courseId"`
	MentorIDs    []primitive.ObjectID `bson:"mentorIds" json:"mentorIds"`
	StudentLimit int                  `bson:"studentLimit" json:"studentLimit"`
	Schedule     Schedule             `bson:"schedule" json:"schedule"`
	StartDate    time.Time            `bson:"startDate" json:"startDate"`
	Status       GroupStatus          `bson:"status" json:"status"`
	CreatedAt    time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time            `bson:"updatedAt" json:"updatedAt"`
}
