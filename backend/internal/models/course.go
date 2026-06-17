package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MonthlyPrice is the tuition price for a specific course month (1-based).
type MonthlyPrice struct {
	MonthIndex int   `bson:"monthIndex" json:"monthIndex"`
	Price      int64 `bson:"price" json:"price"`
}

// MentorRate records a mentor-per-student rate effective from a given date.
type MentorRate struct {
	Rate          int64     `bson:"rate" json:"rate"`
	EffectiveFrom time.Time `bson:"effectiveFrom" json:"effectiveFrom"`
}

// CourseStatus enumerates course states.
type CourseStatus string

const (
	CourseActive   CourseStatus = "active"
	CourseArchived CourseStatus = "archived"
)

// Course is a program of study with monthly pricing.
type Course struct {
	ID                  primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title               string             `bson:"title" json:"title"`
	Description         string             `bson:"description,omitempty" json:"description,omitempty"`
	DurationMonths      int                `bson:"durationMonths" json:"durationMonths"`
	MonthlyPrices       []MonthlyPrice     `bson:"monthlyPrices" json:"monthlyPrices"`
	LessonsPerMonth     int                `bson:"lessonsPerMonth" json:"lessonsPerMonth"`
	MentorRatePerStudent int64             `bson:"mentorRatePerStudent" json:"mentorRatePerStudent"`
	MentorRateHistory   []MentorRate       `bson:"mentorRateHistory" json:"mentorRateHistory"`
	Status              CourseStatus       `bson:"status" json:"status"`
	CreatedAt           time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt           time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// PriceForMonth returns the price configured for a 1-based month index.
// If the exact month is not configured it falls back to the closest lower month.
func (c *Course) PriceForMonth(monthIndex int) int64 {
	var price int64
	best := -1
	for _, mp := range c.MonthlyPrices {
		if mp.MonthIndex == monthIndex {
			return mp.Price
		}
		if mp.MonthIndex < monthIndex && mp.MonthIndex > best {
			best = mp.MonthIndex
			price = mp.Price
		}
	}
	return price
}
