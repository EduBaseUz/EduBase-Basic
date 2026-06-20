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

// TuitionService manages student tuition. Hisoblangan = oylik summa (PriceEntry).
type TuitionService struct {
	tuition     repositories.TuitionRepository
	lessons     repositories.LessonRepository
	attendances repositories.AttendanceRepository
	enrollments repositories.EnrollmentRepository
	groups      repositories.GroupRepository
	courses     repositories.CourseRepository
	users       repositories.UserRepository
}

func NewTuitionService(
	tuition repositories.TuitionRepository,
	lessons repositories.LessonRepository,
	attendances repositories.AttendanceRepository,
	enrollments repositories.EnrollmentRepository,
	groups repositories.GroupRepository,
	courses repositories.CourseRepository,
	users repositories.UserRepository,
) *TuitionService {
	return &TuitionService{
		tuition: tuition, lessons: lessons, attendances: attendances,
		enrollments: enrollments, groups: groups, courses: courses, users: users,
	}
}

// periodKey formats a period start date as the ledger key "2006-01-02".
func periodKey(t time.Time) string { return t.Format("2006-01-02") }

// BalanceRow is one party's outstanding balance (Haqdorlar).
type BalanceRow struct {
	UserID   primitive.ObjectID `json:"userId"`
	FullName string             `json:"fullName"`
	Role     string             `json:"role"`
	Charged  int64              `json:"charged"`
	Paid     int64              `json:"paid"`
	Balance  int64              `json:"balance"`
}

// StudentBalances aggregates every student's charged vs paid across all periods;
// a positive balance means the student still owes.
func (s *TuitionService) StudentBalances(ctx context.Context) ([]BalanceRow, error) {
	ledgers, err := s.tuition.All(ctx)
	if err != nil {
		return nil, err
	}
	agg := map[primitive.ObjectID]*BalanceRow{}
	for _, l := range ledgers {
		r := agg[l.StudentID]
		if r == nil {
			r = &BalanceRow{UserID: l.StudentID, Role: "student"}
			agg[l.StudentID] = r
		}
		r.Charged += l.TotalDue - l.Discount
		r.Paid += models.SumTransactions(l.Transactions)
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

// StudentLedger bundles a ledger with its student and group for the admin view.
type StudentLedger struct {
	Ledger    models.TuitionLedger `json:"ledger"`
	Student   models.User          `json:"student"`
	GroupName string               `json:"groupName"`
}

// ListByCoursePeriod returns every active student's monthly ledger for the
// selected course + period (Oylik narx). Hisoblangan = entry price.
func (s *TuitionService) ListByCoursePeriod(ctx context.Context, courseID primitive.ObjectID, periodStart string) ([]StudentLedger, error) {
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

	out := []StudentLedger{}
	for _, g := range groups {
		enrolls, err := s.enrollments.ListByGroup(ctx, g.ID)
		if err != nil {
			return nil, err
		}
		for _, e := range enrolls {
			// Joriy faol talaba istalgan tanlangan davr uchun ko'rinadi (u hozir
			// o'qiyapti). Chiqib ketganlar esa faqat davr bilan kesishsa.
			if e.Status != models.EnrollmentActive {
				if e.JoinedAt.After(entry.EndDate) {
					continue
				}
				if e.LeftAt != nil && e.LeftAt.Before(entry.StartDate) {
					continue
				}
			}
			ledger, err := s.syncMonthly(ctx, e.StudentID, g.ID, periodStart, entry.Price)
			if err != nil {
				return nil, err
			}
			student, err := s.users.GetByID(ctx, e.StudentID)
			if err != nil {
				continue
			}
			out = append(out, StudentLedger{Ledger: *ledger, Student: *student, GroupName: g.Name})
		}
	}
	return out, nil
}

// syncMonthly creates/updates a ledger with TotalDue = monthly sum.
func (s *TuitionService) syncMonthly(ctx context.Context, studentID, groupID primitive.ObjectID, period string, monthlySum int64) (*models.TuitionLedger, error) {
	ledger, err := s.tuition.GetByKey(ctx, studentID, groupID, period)
	if errors.Is(err, mongo.ErrNotFound) {
		ledger = &models.TuitionLedger{
			StudentID:    studentID,
			GroupID:      groupID,
			Period:       period,
			TotalDue:     monthlySum,
			Discount:     0,
			Transactions: []models.Transaction{},
			Status:       models.ComputeStatus(0, monthlySum),
		}
		if err := s.tuition.Create(ctx, ledger); err != nil {
			return nil, err
		}
		return ledger, nil
	}
	if err != nil {
		return nil, err
	}
	ledger.TotalDue = monthlySum
	ledger.Status = models.ComputeStatus(models.SumTransactions(ledger.Transactions), monthlySum-ledger.Discount)
	if err := s.tuition.Update(ctx, ledger); err != nil {
		return nil, err
	}
	return ledger, nil
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
	// To'lov hisoblangan summadan (chegirma ayirilgan) oshib ketmasligi kerak.
	payable := l.TotalDue - l.Discount
	if models.SumTransactions(l.Transactions)+in.Amount > payable {
		return nil, BadRequest("To'lov hisoblangan summadan oshib ketdi")
	}
	l.Transactions = append(l.Transactions, models.Transaction{
		ID:      primitive.NewObjectID(),
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

// DeleteTransaction removes a payment from a ledger by its transaction id.
func (s *TuitionService) DeleteTransaction(ctx context.Context, id, txnID primitive.ObjectID) (*models.TuitionLedger, error) {
	l, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	kept := l.Transactions[:0:0]
	for _, t := range l.Transactions {
		if t.ID != txnID {
			kept = append(kept, t)
		}
	}
	l.Transactions = kept
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
