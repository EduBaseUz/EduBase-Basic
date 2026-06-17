package services

import (
	"context"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SumToLetter maps a per-lesson total (homework + participation, max 20) to a
// P/M/D letter: 1-9 -> P (yomon), 10-15 -> M (yaxshi), 16-20 -> D (a'lo).
func SumToLetter(total int) string {
	switch {
	case total >= 16:
		return "D"
	case total >= 10:
		return "M"
	case total >= 1:
		return "P"
	default:
		return ""
	}
}

// AcademicService serves student-facing academic data (letters only for grades).
type AcademicService struct {
	groups      repositories.GroupRepository
	enrollments repositories.EnrollmentRepository
	lessons     repositories.LessonRepository
	attendances repositories.AttendanceRepository
	grades      repositories.GradeRepository
}

func NewAcademicService(
	groups repositories.GroupRepository,
	enrollments repositories.EnrollmentRepository,
	lessons repositories.LessonRepository,
	attendances repositories.AttendanceRepository,
	grades repositories.GradeRepository,
) *AcademicService {
	return &AcademicService{groups: groups, enrollments: enrollments, lessons: lessons, attendances: attendances, grades: grades}
}

// MyGroups returns the groups a student is enrolled in.
func (s *AcademicService) MyGroups(ctx context.Context, studentID primitive.ObjectID) ([]models.Group, error) {
	enrolls, err := s.enrollments.ListByStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}
	ids := make([]primitive.ObjectID, 0, len(enrolls))
	for _, e := range enrolls {
		ids = append(ids, e.GroupID)
	}
	return s.groups.ListByIDs(ctx, ids)
}

// AttendanceRow is a student attendance entry with lesson context.
type AttendanceRow struct {
	LessonID  primitive.ObjectID      `json:"lessonId"`
	GroupID   primitive.ObjectID      `json:"groupId"`
	Date      string                  `json:"date"`
	Topic     string                  `json:"topic"`
	Status    models.AttendanceStatus `json:"status"`
}

// MyAttendance returns the student's attendance with lesson topic/date.
func (s *AcademicService) MyAttendance(ctx context.Context, studentID primitive.ObjectID) ([]AttendanceRow, error) {
	atts, err := s.attendances.ListByStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}
	rows := make([]AttendanceRow, 0, len(atts))
	for _, a := range atts {
		row := AttendanceRow{LessonID: a.LessonID, GroupID: a.GroupID, Status: a.Status}
		if l, err := s.lessons.GetByID(ctx, a.LessonID); err == nil {
			row.Date = l.Date.Format("2006-01-02")
			row.Topic = l.Topic
		}
		rows = append(rows, row)
	}
	return rows, nil
}

// GradeRow is a student grade entry exposed only as a P/M/D letter.
type GradeRow struct {
	LessonID primitive.ObjectID `json:"lessonId"`
	GroupID  primitive.ObjectID `json:"groupId"`
	Date     string             `json:"date"`
	Topic    string             `json:"topic"`
	Letter   string             `json:"letter"` // P/M/D only — combined per-lesson, never numeric
}

// MyGrades returns one combined letter per lesson (homework + participation sum).
// Students only ever see the letter, never the numeric scores.
func (s *AcademicService) MyGrades(ctx context.Context, studentID primitive.ObjectID) ([]GradeRow, error) {
	grades, err := s.grades.ListByStudent(ctx, studentID)
	if err != nil {
		return nil, err
	}

	// Sum scores per lesson.
	type agg struct {
		groupID primitive.ObjectID
		total   int
	}
	byLesson := map[primitive.ObjectID]*agg{}
	order := []primitive.ObjectID{}
	for _, g := range grades {
		if byLesson[g.LessonID] == nil {
			byLesson[g.LessonID] = &agg{groupID: g.GroupID}
			order = append(order, g.LessonID)
		}
		byLesson[g.LessonID].total += g.Score
	}

	rows := make([]GradeRow, 0, len(order))
	for _, lessonID := range order {
		a := byLesson[lessonID]
		row := GradeRow{
			LessonID: lessonID,
			GroupID:  a.groupID,
			Letter:   SumToLetter(a.total),
		}
		if l, err := s.lessons.GetByID(ctx, lessonID); err == nil {
			row.Date = l.Date.Format("2006-01-02")
			row.Topic = l.Topic
		}
		rows = append(rows, row)
	}
	return rows, nil
}
