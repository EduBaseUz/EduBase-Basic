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

// TuitionService manages student tuition ledgers (B-variant: per attended lesson).
type TuitionService struct {
	tuition     repositories.TuitionRepository
	lessons     repositories.LessonRepository
	attendances repositories.AttendanceRepository
	enrollments repositories.EnrollmentRepository
	groups      repositories.GroupRepository
}

func NewTuitionService(
	tuition repositories.TuitionRepository,
	lessons repositories.LessonRepository,
	attendances repositories.AttendanceRepository,
	enrollments repositories.EnrollmentRepository,
	groups repositories.GroupRepository,
) *TuitionService {
	return &TuitionService{tuition: tuition, lessons: lessons, attendances: attendances, enrollments: enrollments, groups: groups}
}

// computeDue returns the gross tuition owed by a student in a group for a period,
// summing the snapshot price of each attended (present/late) lesson in that period.
// A student only owes from their join date onward.
func (s *TuitionService) computeDue(ctx context.Context, studentID, groupID primitive.ObjectID, period string, joinedAt time.Time) (int64, error) {
	lessons, err := s.lessons.ListByGroupAll(ctx, groupID)
	if err != nil {
		return 0, err
	}
	atts, err := s.attendances.ListByStudentGroup(ctx, studentID, groupID)
	if err != nil {
		return 0, err
	}
	billable := map[primitive.ObjectID]bool{}
	for _, a := range atts {
		billable[a.LessonID] = a.Status.Billable()
	}

	var total int64
	for _, l := range lessons {
		if l.Status != models.LessonDone {
			continue
		}
		if l.Date.Format("2006-01") != period {
			continue
		}
		if l.Date.Before(joinedAt.Truncate(24 * time.Hour)) {
			continue // joined mid-course: no charge before join date
		}
		if billable[l.ID] {
			total += l.StudentLessonPrice
		}
	}
	return total, nil
}

// SyncLedger recomputes (and creates if needed) a student's ledger for a period.
func (s *TuitionService) SyncLedger(ctx context.Context, studentID, groupID primitive.ObjectID, period string) (*models.TuitionLedger, error) {
	enroll, err := s.enrollments.Get(ctx, studentID, groupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("O'quvchi ushbu guruhda emas")
		}
		return nil, err
	}
	due, err := s.computeDue(ctx, studentID, groupID, period, enroll.JoinedAt)
	if err != nil {
		return nil, err
	}

	ledger, err := s.tuition.GetByKey(ctx, studentID, groupID, period)
	if errors.Is(err, mongo.ErrNotFound) {
		ledger = &models.TuitionLedger{
			StudentID:    studentID,
			GroupID:      groupID,
			Period:       period,
			TotalDue:     due,
			Discount:     0,
			Transactions: []models.Transaction{},
			Status:       models.ComputeStatus(0, due),
		}
		if err := s.tuition.Create(ctx, ledger); err != nil {
			return nil, err
		}
		return ledger, nil
	}
	if err != nil {
		return nil, err
	}
	ledger.TotalDue = due
	ledger.Status = models.ComputeStatus(models.SumTransactions(ledger.Transactions), due-ledger.Discount)
	if err := s.tuition.Update(ctx, ledger); err != nil {
		return nil, err
	}
	return ledger, nil
}

// SyncAllForPeriod ensures ledgers exist & are current for every active enrollment.
func (s *TuitionService) SyncAllForPeriod(ctx context.Context, period string) error {
	page := repositories.Page{Page: 1, Limit: 100}
	for {
		groups, total, err := s.groups.List(ctx, "", page)
		if err != nil {
			return err
		}
		for _, g := range groups {
			enrolls, err := s.enrollments.ListByGroup(ctx, g.ID)
			if err != nil {
				return err
			}
			for _, e := range enrolls {
				if e.Status != models.EnrollmentActive {
					continue
				}
				if _, err := s.SyncLedger(ctx, e.StudentID, g.ID, period); err != nil {
					return err
				}
			}
		}
		if int64(page.Page*page.Limit) >= total {
			break
		}
		page.Page++
	}
	return nil
}

func (s *TuitionService) List(ctx context.Context, period string, p repositories.Page) ([]models.TuitionLedger, int64, error) {
	return s.tuition.List(ctx, period, p)
}

func (s *TuitionService) ListByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.TuitionLedger, error) {
	return s.tuition.ListByStudent(ctx, studentID)
}

func (s *TuitionService) Get(ctx context.Context, id primitive.ObjectID) (*models.TuitionLedger, error) {
	l, err := s.tuition.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("To'lov yozuvi topilmadi")
		}
		return nil, err
	}
	return l, nil
}

// TransactionInput is a recorded payment.
type TransactionInput struct {
	Amount  int64  `json:"amount" validate:"required,min=1"`
	Comment string `json:"comment"`
	Date    string `json:"date"`
}

// AddTransaction records a payment against a ledger.
func (s *TuitionService) AddTransaction(ctx context.Context, id, actorID primitive.ObjectID, in TransactionInput) (*models.TuitionLedger, error) {
	l, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	date := time.Now()
	if in.Date != "" {
		if d, err := parseDate(in.Date); err == nil {
			date = d
		}
	}
	l.Transactions = append(l.Transactions, models.Transaction{
		Date:    date,
		Amount:  in.Amount,
		Comment: in.Comment,
		By:      actorID,
	})
	l.Status = models.ComputeStatus(models.SumTransactions(l.Transactions), l.TotalDue-l.Discount)
	if err := s.tuition.Update(ctx, l); err != nil {
		return nil, err
	}
	return l, nil
}

// UpdateLedgerInput updates a ledger's discount.
type UpdateLedgerInput struct {
	Discount *int64 `json:"discount" validate:"omitempty,min=0"`
}

// Update sets the discount and recomputes status.
func (s *TuitionService) Update(ctx context.Context, id primitive.ObjectID, in UpdateLedgerInput) (*models.TuitionLedger, error) {
	l, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if in.Discount != nil {
		l.Discount = *in.Discount
	}
	l.Status = models.ComputeStatus(models.SumTransactions(l.Transactions), l.TotalDue-l.Discount)
	if err := s.tuition.Update(ctx, l); err != nil {
		return nil, err
	}
	return l, nil
}
