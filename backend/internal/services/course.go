package services

import (
	"context"
	"errors"
	"time"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"edubase/backend/internal/repositories/mongo"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CourseService manages courses (admin-only).
type CourseService struct {
	courses repositories.CourseRepository
}

func NewCourseService(courses repositories.CourseRepository) *CourseService {
	return &CourseService{courses: courses}
}

// MonthlyPriceInput is one month's price.
type MonthlyPriceInput struct {
	MonthIndex int   `json:"monthIndex" validate:"required,min=1"`
	Price      int64 `json:"price" validate:"min=0"`
}

// CreateCourseInput is the payload for creating a course.
// Faqat nom va tasnif majburiy; raqamli sozlamalar keyin (settings) kiritiladi.
type CreateCourseInput struct {
	Title                string              `json:"title" validate:"required,min=2"`
	Description          string              `json:"description"`
	DurationMonths       int                 `json:"durationMonths" validate:"min=0"`
	MonthlyPrices        []MonthlyPriceInput `json:"monthlyPrices" validate:"omitempty,dive"`
	LessonsPerMonth      int                 `json:"lessonsPerMonth" validate:"min=0"`
	MentorRatePerStudent int64               `json:"mentorRatePerStudent" validate:"min=0"`
}

// PriceEntryInput is one date-range tuition price (Oylik narxlar) together with
// its per-student mentor payment.
type PriceEntryInput struct {
	StartDate  string `json:"startDate" validate:"required"`
	EndDate    string `json:"endDate" validate:"required"`
	Price      int64  `json:"price" validate:"min=0"`
	MentorRate int64  `json:"mentorRate" validate:"min=0"`
}

// UpdateCourseInput is the payload for updating a course.
type UpdateCourseInput struct {
	Title                *string             `json:"title"`
	Description          *string             `json:"description"`
	DurationMonths       *int                `json:"durationMonths"`
	MonthlyPrices        []MonthlyPriceInput `json:"monthlyPrices"`
	LessonsPerMonth      *int                `json:"lessonsPerMonth"`
	MentorRatePerStudent *int64              `json:"mentorRatePerStudent"`
	PriceEntries         *[]PriceEntryInput  `json:"priceEntries"`
	Status               *string             `json:"status" validate:"omitempty,oneof=active archived"`
}

func toMonthlyPrices(in []MonthlyPriceInput) []models.MonthlyPrice {
	out := make([]models.MonthlyPrice, 0, len(in))
	for _, mp := range in {
		out = append(out, models.MonthlyPrice{MonthIndex: mp.MonthIndex, Price: mp.Price})
	}
	return out
}

func (s *CourseService) Create(ctx context.Context, in CreateCourseInput) (*models.Course, error) {
	c := &models.Course{
		Title:                in.Title,
		Description:          in.Description,
		DurationMonths:       in.DurationMonths,
		MonthlyPrices:        toMonthlyPrices(in.MonthlyPrices),
		LessonsPerMonth:      in.LessonsPerMonth,
		MentorRatePerStudent: in.MentorRatePerStudent,
		MentorRateHistory:    []models.MentorRate{{Rate: in.MentorRatePerStudent, EffectiveFrom: time.Now()}},
		Status:               models.CourseActive,
	}
	if err := s.courses.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *CourseService) Get(ctx context.Context, id primitive.ObjectID) (*models.Course, error) {
	c, err := s.courses.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("Kurs topilmadi")
		}
		return nil, err
	}
	return c, nil
}

func (s *CourseService) List(ctx context.Context, status string, p repositories.Page) ([]models.Course, int64, error) {
	return s.courses.List(ctx, status, p)
}

func (s *CourseService) Update(ctx context.Context, id primitive.ObjectID, in UpdateCourseInput) (*models.Course, error) {
	c, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if in.Title != nil {
		c.Title = *in.Title
	}
	if in.Description != nil {
		c.Description = *in.Description
	}
	if in.DurationMonths != nil {
		c.DurationMonths = *in.DurationMonths
	}
	if in.MonthlyPrices != nil {
		c.MonthlyPrices = toMonthlyPrices(in.MonthlyPrices)
	}
	if in.LessonsPerMonth != nil {
		c.LessonsPerMonth = *in.LessonsPerMonth
	}
	if in.MentorRatePerStudent != nil && *in.MentorRatePerStudent != c.MentorRatePerStudent {
		// Record a new rate in history; past lessons keep their snapshot.
		c.MentorRatePerStudent = *in.MentorRatePerStudent
		c.MentorRateHistory = append(c.MentorRateHistory, models.MentorRate{
			Rate:          *in.MentorRatePerStudent,
			EffectiveFrom: time.Now(),
		})
	}
	if in.Status != nil {
		c.Status = models.CourseStatus(*in.Status)
	}
	if in.PriceEntries != nil {
		entries := make([]models.PriceEntry, 0, len(*in.PriceEntries))
		for _, e := range *in.PriceEntries {
			start, err := parseDate(e.StartDate)
			if err != nil {
				return nil, BadRequest("Yaroqsiz boshlanish sanasi")
			}
			end, err := parseDate(e.EndDate)
			if err != nil {
				return nil, BadRequest("Yaroqsiz tugash sanasi")
			}
			if end.Before(start) {
				return nil, BadRequest("Tugash sanasi boshlanishdan oldin bo'lmasligi kerak")
			}
			entries = append(entries, models.PriceEntry{StartDate: start, EndDate: end, Price: e.Price, MentorRate: e.MentorRate})
		}
		c.PriceEntries = entries
	}
	if err := s.courses.Update(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *CourseService) Delete(ctx context.Context, id primitive.ObjectID) error {
	if _, err := s.Get(ctx, id); err != nil {
		return err
	}
	return s.courses.Delete(ctx, id)
}
