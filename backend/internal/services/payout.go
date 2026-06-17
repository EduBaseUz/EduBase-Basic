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

// PayoutService manages mentor payouts.
type PayoutService struct {
	payouts     repositories.PayoutRepository
	lessons     repositories.LessonRepository
	attendances repositories.AttendanceRepository
	users       repositories.UserRepository
}

func NewPayoutService(
	payouts repositories.PayoutRepository,
	lessons repositories.LessonRepository,
	attendances repositories.AttendanceRepository,
	users repositories.UserRepository,
) *PayoutService {
	return &PayoutService{payouts: payouts, lessons: lessons, attendances: attendances, users: users}
}

// computeEarned sums salary for lessons a mentor personally conducted in a period.
// Per lesson: (#students present or late) * lesson.MentorRateSnapshot.
func (s *PayoutService) computeEarned(ctx context.Context, mentorID primitive.ObjectID, period string) (int64, error) {
	from, err := time.Parse("2006-01", period)
	if err != nil {
		return 0, BadRequest("Yaroqsiz davr (YYYY-MM kutilmoqda)")
	}
	to := from.AddDate(0, 1, 0)
	lessons, err := s.lessons.ListByMentorPeriod(ctx, mentorID, from, to)
	if err != nil {
		return 0, err
	}
	var total int64
	for _, l := range lessons {
		if l.Status != models.LessonDone {
			continue
		}
		atts, err := s.attendances.ListByLesson(ctx, l.ID)
		if err != nil {
			return 0, err
		}
		var billable int64
		for _, a := range atts {
			if a.Status.Billable() {
				billable++
			}
		}
		total += billable * l.MentorRateSnapshot
	}
	return total, nil
}

// SyncPayout recomputes (and creates if needed) a mentor's payout for a period.
func (s *PayoutService) SyncPayout(ctx context.Context, mentorID primitive.ObjectID, period string) (*models.Payout, error) {
	earned, err := s.computeEarned(ctx, mentorID, period)
	if err != nil {
		return nil, err
	}
	p, err := s.payouts.GetByKey(ctx, mentorID, period)
	if errors.Is(err, mongo.ErrNotFound) {
		p = &models.Payout{
			MentorID:     mentorID,
			Period:       period,
			EarnedAmount: earned,
			Transactions: []models.Transaction{},
			Status:       models.ComputeStatus(0, earned),
		}
		if err := s.payouts.Create(ctx, p); err != nil {
			return nil, err
		}
		return p, nil
	}
	if err != nil {
		return nil, err
	}
	p.EarnedAmount = earned
	p.Status = models.ComputeStatus(models.SumTransactions(p.Transactions), earned)
	if err := s.payouts.Update(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// SyncAllForPeriod ensures payouts exist & are current for every mentor.
func (s *PayoutService) SyncAllForPeriod(ctx context.Context, period string) error {
	page := repositories.Page{Page: 1, Limit: 100}
	for {
		mentors, total, err := s.users.List(ctx, repositories.UserFilter{Role: string(models.RoleMentor)}, page)
		if err != nil {
			return err
		}
		for _, m := range mentors {
			if _, err := s.SyncPayout(ctx, m.ID, period); err != nil {
				return err
			}
		}
		if int64(page.Page*page.Limit) >= total {
			break
		}
		page.Page++
	}
	return nil
}

func (s *PayoutService) List(ctx context.Context, period string, p repositories.Page) ([]models.Payout, int64, error) {
	return s.payouts.List(ctx, period, p)
}

func (s *PayoutService) ListByMentor(ctx context.Context, mentorID primitive.ObjectID) ([]models.Payout, error) {
	return s.payouts.ListByMentor(ctx, mentorID)
}

func (s *PayoutService) Get(ctx context.Context, id primitive.ObjectID) (*models.Payout, error) {
	p, err := s.payouts.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("To'lov yozuvi topilmadi")
		}
		return nil, err
	}
	return p, nil
}

// AddTransaction records a payment to a mentor.
func (s *PayoutService) AddTransaction(ctx context.Context, id, actorID primitive.ObjectID, in TransactionInput) (*models.Payout, error) {
	p, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	date := time.Now()
	if in.Date != "" {
		if d, err := parseDate(in.Date); err == nil {
			date = d
		}
	}
	p.Transactions = append(p.Transactions, models.Transaction{
		Date:    date,
		Amount:  in.Amount,
		Comment: in.Comment,
		By:      actorID,
	})
	p.Status = models.ComputeStatus(models.SumTransactions(p.Transactions), p.EarnedAmount)
	if err := s.payouts.Update(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}
