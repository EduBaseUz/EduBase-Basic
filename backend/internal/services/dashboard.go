package services

import (
	"context"
	"sort"
	"time"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DashboardService aggregates statistics and the finance P&L.
type DashboardService struct {
	repos *repositories.Repositories
}

func NewDashboardService(repos *repositories.Repositories) *DashboardService {
	return &DashboardService{repos: repos}
}

func inRange(t time.Time, from, to *time.Time) bool {
	if from != nil && t.Before(*from) {
		return false
	}
	if to != nil && !t.Before(*to) {
		return false
	}
	return true
}

// MonthlyPoint is one month's income/expense for charts.
type MonthlyPoint struct {
	Month   string `json:"month"` // YYYY-MM
	Income  int64  `json:"income"`
	Expense int64  `json:"expense"`
}

// FinanceSummary is the admin P&L.
type FinanceSummary struct {
	TotalIncome  int64          `json:"totalIncome"`
	TotalExpense int64          `json:"totalExpense"`
	Profit       int64          `json:"profit"`
	Monthly      []MonthlyPoint `json:"monthly"`
}

// Summary computes income (tuition payments) vs expense (mentor payouts).
func (s *DashboardService) Summary(ctx context.Context, from, to *time.Time) (*FinanceSummary, error) {
	ledgers, err := s.repos.Tuition.All(ctx)
	if err != nil {
		return nil, err
	}
	payouts, err := s.repos.Payouts.All(ctx)
	if err != nil {
		return nil, err
	}

	monthly := map[string]*MonthlyPoint{}
	point := func(m string) *MonthlyPoint {
		if monthly[m] == nil {
			monthly[m] = &MonthlyPoint{Month: m}
		}
		return monthly[m]
	}

	var income, expense int64
	for _, l := range ledgers {
		for _, t := range l.Transactions {
			if !inRange(t.Date, from, to) {
				continue
			}
			income += t.Amount
			point(t.Date.Format("2006-01")).Income += t.Amount
		}
	}
	for _, p := range payouts {
		for _, t := range p.Transactions {
			if !inRange(t.Date, from, to) {
				continue
			}
			expense += t.Amount
			point(t.Date.Format("2006-01")).Expense += t.Amount
		}
	}

	points := make([]MonthlyPoint, 0, len(monthly))
	for _, p := range monthly {
		points = append(points, *p)
	}
	sort.Slice(points, func(i, j int) bool { return points[i].Month < points[j].Month })

	return &FinanceSummary{
		TotalIncome:  income,
		TotalExpense: expense,
		Profit:       income - expense,
		Monthly:      points,
	}, nil
}

// AdminDashboard is the admin overview.
type AdminDashboard struct {
	Students int64           `json:"students"`
	Mentors  int64           `json:"mentors"`
	Courses  int64           `json:"courses"`
	Groups   int64           `json:"groups"`
	Lessons  int64           `json:"lessons"`
	Finance  *FinanceSummary `json:"finance"`
}

func (s *DashboardService) Admin(ctx context.Context) (*AdminDashboard, error) {
	students, _ := s.repos.Users.CountByRole(ctx, models.RoleStudent)
	mentors, _ := s.repos.Users.CountByRole(ctx, models.RoleMentor)
	courses, _ := s.repos.Courses.Count(ctx)
	groups, _ := s.repos.Groups.Count(ctx)
	lessons, _ := s.repos.Lessons.Count(ctx)
	fin, err := s.Summary(ctx, nil, nil)
	if err != nil {
		return nil, err
	}
	return &AdminDashboard{
		Students: students, Mentors: mentors, Courses: courses,
		Groups: groups, Lessons: lessons, Finance: fin,
	}, nil
}

// MentorDashboard is the mentor overview.
type MentorDashboard struct {
	Groups        int64          `json:"groups"`
	Lessons       int64          `json:"lessons"`
	Students      int            `json:"students"`
	EarnedThisMonth int64        `json:"earnedThisMonth"`
	Monthly       []MonthlyPoint `json:"monthly"` // earnings per month (income field reused)
}

func (s *DashboardService) Mentor(ctx context.Context, mentorID primitive.ObjectID) (*MentorDashboard, error) {
	groups, _, err := s.repos.Groups.ListByMentor(ctx, mentorID, repositories.Page{Page: 1, Limit: 1000})
	if err != nil {
		return nil, err
	}
	studentSet := map[primitive.ObjectID]bool{}
	for _, g := range groups {
		enrolls, _ := s.repos.Enrollments.ListByGroup(ctx, g.ID)
		for _, e := range enrolls {
			if e.Status == models.EnrollmentActive {
				studentSet[e.StudentID] = true
			}
		}
	}

	lessons, err := s.repos.Lessons.ListByMentor(ctx, mentorID)
	if err != nil {
		return nil, err
	}

	monthly := map[string]*MonthlyPoint{}
	var earnedThisMonth int64
	thisMonth := time.Now().Format("2006-01")
	for _, l := range lessons {
		if l.Status != models.LessonDone {
			continue
		}
		atts, _ := s.repos.Attendances.ListByLesson(ctx, l.ID)
		var billable int64
		for _, a := range atts {
			if a.Status.Billable() {
				billable++
			}
		}
		earned := billable * l.MentorRateSnapshot
		m := l.Date.Format("2006-01")
		if monthly[m] == nil {
			monthly[m] = &MonthlyPoint{Month: m}
		}
		monthly[m].Income += earned
		if m == thisMonth {
			earnedThisMonth += earned
		}
	}
	points := make([]MonthlyPoint, 0, len(monthly))
	for _, p := range monthly {
		points = append(points, *p)
	}
	sort.Slice(points, func(i, j int) bool { return points[i].Month < points[j].Month })

	return &MentorDashboard{
		Groups:          int64(len(groups)),
		Lessons:         int64(len(lessons)),
		Students:        len(studentSet),
		EarnedThisMonth: earnedThisMonth,
		Monthly:         points,
	}, nil
}

// StudentDashboard is the student overview.
type StudentDashboard struct {
	Groups          int     `json:"groups"`
	AttendanceRatio float64 `json:"attendanceRatio"`
	Lessons         int     `json:"lessons"`
	GradeLetters    map[string]int `json:"gradeLetters"` // P/M/D distribution
}

func (s *DashboardService) Student(ctx context.Context, studentID primitive.ObjectID) (*StudentDashboard, error) {
	enrolls, err := s.repos.Enrollments.ListByStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}
	groupCount := 0
	for _, e := range enrolls {
		if e.Status == models.EnrollmentActive {
			groupCount++
		}
	}

	atts, err := s.repos.Attendances.ListByStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}
	var present, late, absent int
	for _, a := range atts {
		switch a.Status {
		case models.AttPresent:
			present++
		case models.AttLate:
			late++
		case models.AttAbsent:
			absent++
		}
	}
	var ratio float64
	if denom := present + late + absent; denom > 0 {
		ratio = float64(present+late) / float64(denom)
	}

	grades, err := s.repos.Grades.ListByStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}
	// Combine per lesson (homework + participation) then map to a letter.
	totals := map[primitive.ObjectID]int{}
	for _, g := range grades {
		totals[g.LessonID] += g.Score
	}
	letters := map[string]int{"P": 0, "M": 0, "D": 0}
	for _, total := range totals {
		letters[SumToLetter(total)]++
	}

	return &StudentDashboard{
		Groups:          groupCount,
		AttendanceRatio: ratio,
		Lessons:         len(atts),
		GradeLetters:    letters,
	}, nil
}
