package services

import (
	"context"
	"sort"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RatingService computes per-group student rankings.
type RatingService struct {
	groups      repositories.GroupRepository
	users       repositories.UserRepository
	grades      repositories.GradeRepository
	attendances repositories.AttendanceRepository
	enrollments repositories.EnrollmentRepository
}

func NewRatingService(
	groups repositories.GroupRepository,
	users repositories.UserRepository,
	grades repositories.GradeRepository,
	attendances repositories.AttendanceRepository,
	enrollments repositories.EnrollmentRepository,
) *RatingService {
	return &RatingService{groups: groups, users: users, grades: grades, attendances: attendances, enrollments: enrollments}
}

// RatingRow is one student's rating entry.
type RatingRow struct {
	StudentID       primitive.ObjectID `json:"studentId"`
	FullName        string             `json:"fullName"`
	Average         float64            `json:"average"`
	GradeCount      int                `json:"gradeCount"`
	AttendanceRatio float64            `json:"attendanceRatio"`
	Rank            int                `json:"rank"`
}

// GroupRating returns ranked students for a group.
func (s *RatingService) GroupRating(ctx context.Context, groupID primitive.ObjectID) ([]RatingRow, error) {
	enrolls, err := s.enrollments.ListByGroup(ctx, groupID)
	if err != nil {
		return nil, err
	}
	grades, err := s.grades.ListByGroup(ctx, groupID)
	if err != nil {
		return nil, err
	}
	atts, err := s.attendances.ListByGroup(ctx, groupID)
	if err != nil {
		return nil, err
	}

	type acc struct {
		// lessonTotals: dars bo'yicha (uy vazifasi + faollik) yig'indisi.
		lessonTotals map[primitive.ObjectID]int
		present      int
		late         int
		absent       int
	}
	stats := map[primitive.ObjectID]*acc{}
	get := func(id primitive.ObjectID) *acc {
		if stats[id] == nil {
			stats[id] = &acc{lessonTotals: map[primitive.ObjectID]int{}}
		}
		return stats[id]
	}

	for _, e := range enrolls {
		_ = get(e.StudentID) // ensure every enrolled student appears
	}
	for _, g := range grades {
		a := get(g.StudentID)
		a.lessonTotals[g.LessonID] += g.Score
	}
	for _, at := range atts {
		a := get(at.StudentID)
		switch at.Status {
		case models.AttPresent:
			a.present++
		case models.AttLate:
			a.late++
		case models.AttAbsent:
			a.absent++
		}
	}

	rows := make([]RatingRow, 0, len(stats))
	for id, a := range stats {
		// O'rtacha baho = baholangan darslar yig'indilarining o'rtachasi (0-20).
		var avg float64
		lessonCount := len(a.lessonTotals)
		if lessonCount > 0 {
			var totalSum int
			for _, t := range a.lessonTotals {
				totalSum += t
			}
			avg = float64(totalSum) / float64(lessonCount)
		}
		denom := a.present + a.late + a.absent
		var ratio float64
		if denom > 0 {
			ratio = float64(a.present+a.late) / float64(denom)
		}
		name := ""
		if u, err := s.users.GetByID(ctx, id); err == nil {
			name = u.FullName
		}
		rows = append(rows, RatingRow{
			StudentID:       id,
			FullName:        name,
			Average:         avg,
			GradeCount:      lessonCount,
			AttendanceRatio: ratio,
		})
	}

	sort.SliceStable(rows, func(i, j int) bool {
		if rows[i].Average != rows[j].Average {
			return rows[i].Average > rows[j].Average // higher average first
		}
		return rows[i].AttendanceRatio > rows[j].AttendanceRatio // tiebreak
	})
	for i := range rows {
		rows[i].Rank = i + 1
	}
	return rows, nil
}
