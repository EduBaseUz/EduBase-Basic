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
	courses     repositories.CourseRepository
	groups      repositories.GroupRepository
}

func NewPayoutService(
	payouts repositories.PayoutRepository,
	lessons repositories.LessonRepository,
	attendances repositories.AttendanceRepository,
	users repositories.UserRepository,
	courses repositories.CourseRepository,
	groups repositories.GroupRepository,
) *PayoutService {
	return &PayoutService{
		payouts: payouts, lessons: lessons, attendances: attendances,
		users: users, courses: courses, groups: groups,
	}
}

// MentorPayout bundles a payout with its mentor for the admin view.
type MentorPayout struct {
	Payout models.Payout `json:"payout"`
	Mentor models.User   `json:"mentor"`
}

// computeEarnedRange sums a mentor's salary for lessons they conducted in the
// given course's groups within [start, end]: per lesson (#billable students) ×
// mentor rate snapshot.
func (s *PayoutService) computeEarnedRange(ctx context.Context, mentorID primitive.ObjectID, groupIDs map[primitive.ObjectID]bool, start, end time.Time) (int64, error) {
	lessons, err := s.lessons.ListByMentor(ctx, mentorID)
	if err != nil {
		return 0, err
	}
	var total int64
	for _, l := range lessons {
		if l.Status != models.LessonDone || !groupIDs[l.GroupID] {
			continue
		}
		if l.Date.Before(start) || l.Date.After(end) {
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

// ListByCoursePeriod returns each mentor's payout for the selected course +
// period. Hisoblangan = attended students × 1 kishilik to'lov.
func (s *PayoutService) ListByCoursePeriod(ctx context.Context, courseID primitive.ObjectID, periodStart string) ([]MentorPayout, error) {
	course, err := s.courses.GetByID(ctx, courseID)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("Mutaxassislik topilmadi")
		}
		return nil, err
	}
	var entry *models.PriceEntry
	for i := range course.PriceEntries {
		if periodKey(course.PriceEntries[i].StartDate) == periodStart {
			entry = &course.PriceEntries[i]
			break
		}
	}
	if entry == nil {
		return nil, BadRequest("Davr topilmadi")
	}

	groups, err := s.groups.ListByCourse(ctx, courseID)
	if err != nil {
		return nil, err
	}
	groupIDs := map[primitive.ObjectID]bool{}
	mentorIDs := map[primitive.ObjectID]bool{}
	for _, g := range groups {
		groupIDs[g.ID] = true
		for _, m := range g.MentorIDs {
			mentorIDs[m] = true
		}
	}

	out := []MentorPayout{}
	for mid := range mentorIDs {
		earned, err := s.computeEarnedRange(ctx, mid, groupIDs, entry.StartDate, entry.EndDate)
		if err != nil {
			return nil, err
		}
		payout, err := s.syncCoursePayout(ctx, mid, courseID, periodStart, earned)
		if err != nil {
			return nil, err
		}
		mentor, err := s.users.GetByID(ctx, mid)
		if err != nil {
			continue
		}
		out = append(out, MentorPayout{Payout: *payout, Mentor: *mentor})
	}
	return out, nil
}

// syncCoursePayout creates/updates a course-scoped payout with the earned amount.
func (s *PayoutService) syncCoursePayout(ctx context.Context, mentorID, courseID primitive.ObjectID, period string, earned int64) (*models.Payout, error) {
	p, err := s.payouts.GetByCourseKey(ctx, mentorID, courseID, period)
	if errors.Is(err, mongo.ErrNotFound) {
		p = &models.Payout{
			MentorID:     mentorID,
			CourseID:     courseID,
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

// MentorBalances aggregates each mentor's earned vs paid; a positive balance
// means the organization still owes the mentor.
func (s *PayoutService) MentorBalances(ctx context.Context) ([]BalanceRow, error) {
	payouts, err := s.payouts.All(ctx)
	if err != nil {
		return nil, err
	}
	agg := map[primitive.ObjectID]*BalanceRow{}
	for _, p := range payouts {
		r := agg[p.MentorID]
		if r == nil {
			r = &BalanceRow{UserID: p.MentorID, Role: "mentor"}
			agg[p.MentorID] = r
		}
		r.Charged += p.EarnedAmount
		r.Paid += models.SumTransactions(p.Transactions)
	}
	out := []BalanceRow{}
	for id, r := range agg {
		r.Balance = r.Charged - r.Paid
		if r.Balance == 0 {
			continue
		}
		if u, err := s.users.GetByID(ctx, id); err == nil {
			r.FullName = u.FullName
		}
		out = append(out, *r)
	}
	return out, nil
}

// DeleteTransaction removes a payment from a payout by its transaction id.
func (s *PayoutService) DeleteTransaction(ctx context.Context, id, txnID primitive.ObjectID) (*models.Payout, error) {
	p, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	kept := p.Transactions[:0:0]
	for _, t := range p.Transactions {
		if t.ID != txnID {
			kept = append(kept, t)
		}
	}
	p.Transactions = kept
	p.Status = models.ComputeStatus(models.SumTransactions(p.Transactions), p.EarnedAmount)
	if err := s.payouts.Update(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
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
		ID:      primitive.NewObjectID(),
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
