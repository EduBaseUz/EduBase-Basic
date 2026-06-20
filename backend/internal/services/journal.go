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

// JournalService handles lessons, homework, attendance and grades.
type JournalService struct {
	groups      repositories.GroupRepository
	courses     repositories.CourseRepository
	lessons     repositories.LessonRepository
	homeworks   repositories.HomeworkRepository
	attendances repositories.AttendanceRepository
	grades      repositories.GradeRepository
	enrollments repositories.EnrollmentRepository
}

func NewJournalService(
	groups repositories.GroupRepository,
	courses repositories.CourseRepository,
	lessons repositories.LessonRepository,
	homeworks repositories.HomeworkRepository,
	attendances repositories.AttendanceRepository,
	grades repositories.GradeRepository,
	enrollments repositories.EnrollmentRepository,
) *JournalService {
	return &JournalService{
		groups: groups, courses: courses, lessons: lessons, homeworks: homeworks,
		attendances: attendances, grades: grades, enrollments: enrollments,
	}
}

// CreateLessonInput is the payload for creating a lesson with homework.
type CreateLessonInput struct {
	Date                string `json:"date" validate:"required"`
	Topic               string `json:"topic" validate:"required,min=1"`
	Kind                string `json:"kind" validate:"omitempty,oneof=main extra"`
	HomeworkTitle       string `json:"homeworkTitle"`
	HomeworkDescription string `json:"homeworkDescription"`
}

// UpdateLessonInput is the payload for editing a lesson.
type UpdateLessonInput struct {
	Date                *string `json:"date"`
	Topic               *string `json:"topic"`
	Kind                *string `json:"kind" validate:"omitempty,oneof=main extra"`
	Status              *string `json:"status" validate:"omitempty,oneof=done cancelled"`
	HomeworkTitle       *string `json:"homeworkTitle"`
	HomeworkDescription *string `json:"homeworkDescription"`
}

// countMainLessonsInRange counts main lessons in a group within [start, end],
// optionally excluding one lesson (used when editing).
func (s *JournalService) countMainLessonsInRange(ctx context.Context, groupID primitive.ObjectID, start, end time.Time, excludeID primitive.ObjectID) (int, error) {
	all, err := s.lessons.ListByGroupAll(ctx, groupID)
	if err != nil {
		return 0, err
	}
	n := 0
	for _, l := range all {
		if l.ID == excludeID {
			continue
		}
		if l.Kind == models.LessonExtra { // qo'shimcha dars sanalmaydi (bo'sh = asosiy)
			continue
		}
		if !l.Date.Before(start) && !l.Date.After(end) {
			n++
		}
	}
	return n, nil
}

// MentorOwnsGroup verifies a mentor is assigned to a group.
func MentorOwnsGroup(g *models.Group, mentorID primitive.ObjectID) bool {
	for _, m := range g.MentorIDs {
		if m == mentorID {
			return true
		}
	}
	return false
}

// computeMonthIndex returns the 1-based course month a date falls into,
// derived from the group's start date, capped at durationMonths.
func computeMonthIndex(start, date time.Time, durationMonths int) int {
	if date.Before(start) {
		return 1
	}
	months := int(date.Year()-start.Year())*12 + int(date.Month()-start.Month())
	idx := months + 1
	if idx < 1 {
		idx = 1
	}
	if durationMonths > 0 && idx > durationMonths {
		idx = durationMonths
	}
	return idx
}

// CreateLesson creates a lesson (and homework) for a group the mentor owns,
// snapshotting per-lesson student price and mentor rate.
func (s *JournalService) CreateLesson(ctx context.Context, groupID, mentorID primitive.ObjectID, in CreateLessonInput) (*models.Lesson, error) {
	g, err := s.groups.GetByID(ctx, groupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("Guruh topilmadi")
		}
		return nil, err
	}
	if !MentorOwnsGroup(g, mentorID) {
		return nil, Forbidden("Siz ushbu guruhga biriktirilmagansiz")
	}
	course, err := s.courses.GetByID(ctx, g.CourseID)
	if err != nil {
		return nil, err
	}
	date, err := parseDate(in.Date)
	if err != nil {
		return nil, BadRequest("Yaroqsiz sana")
	}

	kind := models.LessonKind(in.Kind)
	if kind == "" {
		kind = models.LessonMain
	}

	// Dars sanasi qaysi "Oylik narx" davriga tegishli? Oylik narxlar kiritilgan
	// bo'lsa, dars o'sha davr (Boshlanish–Tugash) ichida bo'lishi shart.
	entry := course.PriceEntryForDate(date)
	if len(course.PriceEntries) > 0 && entry == nil {
		return nil, BadRequest("Dars sanasi belgilangan oylik davrlardan tashqarida")
	}

	// Asosiy darslar oylik darslar sonidan oshmasligi kerak (qo'shimcha — cheksiz).
	if kind == models.LessonMain && entry != nil && course.LessonsPerMonth > 0 {
		count, err := s.countMainLessonsInRange(ctx, groupID, entry.StartDate, entry.EndDate, primitive.NilObjectID)
		if err != nil {
			return nil, err
		}
		if count >= course.LessonsPerMonth {
			return nil, Conflict("Bu oy uchun asosiy darslar soni to'ldi (%d ta). Qo'shimcha dars sifatida qo'shing", course.LessonsPerMonth)
		}
	}

	monthIndex := computeMonthIndex(g.StartDate, date, course.DurationMonths)

	// Narx va 1 kishilik to'lov dars sanasiga mos davrdan olinadi; topilmasa eski
	// umumiy sozlamaga qaytamiz. Asosiy va qo'shimcha dars bir xil narxlanadi.
	monthlyPrice := course.PriceForMonth(monthIndex)
	mentorRate := course.MentorRatePerStudent
	if entry != nil {
		monthlyPrice = entry.Price
		mentorRate = entry.MentorRate
	}
	var studentPrice int64
	if course.LessonsPerMonth > 0 {
		studentPrice = monthlyPrice / int64(course.LessonsPerMonth)
	}

	l := &models.Lesson{
		GroupID:             groupID,
		ConductedByMentorID: mentorID,
		Date:                date,
		Topic:               in.Topic,
		Kind:                kind,
		MonthIndex:          monthIndex,
		StudentLessonPrice:  studentPrice,
		MentorRateSnapshot:  mentorRate,
		Status:              models.LessonDone,
	}
	if err := s.lessons.Create(ctx, l); err != nil {
		return nil, err
	}

	if in.HomeworkTitle != "" || in.HomeworkDescription != "" {
		hw := &models.Homework{
			LessonID:    l.ID,
			GroupID:     groupID,
			Title:       in.HomeworkTitle,
			Description: in.HomeworkDescription,
		}
		if err := s.homeworks.Create(ctx, hw); err != nil {
			return nil, err
		}
	}
	return l, nil
}

func (s *JournalService) GetLesson(ctx context.Context, id primitive.ObjectID) (*models.Lesson, error) {
	l, err := s.lessons.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("Dars topilmadi")
		}
		return nil, err
	}
	return l, nil
}

func (s *JournalService) GetHomework(ctx context.Context, lessonID primitive.ObjectID) (*models.Homework, error) {
	hw, err := s.homeworks.GetByLesson(ctx, lessonID)
	if errors.Is(err, mongo.ErrNotFound) {
		return nil, nil
	}
	return hw, err
}

func (s *JournalService) ListLessons(ctx context.Context, groupID primitive.ObjectID, p repositories.Page) ([]models.Lesson, int64, error) {
	return s.lessons.ListByGroup(ctx, groupID, p)
}

// UpdateLesson edits a lesson (mentor must own the group).
func (s *JournalService) UpdateLesson(ctx context.Context, lessonID, mentorID primitive.ObjectID, isAdmin bool, in UpdateLessonInput) (*models.Lesson, error) {
	l, err := s.GetLesson(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	g, err := s.groups.GetByID(ctx, l.GroupID)
	if err != nil {
		return nil, err
	}
	if !isAdmin && !MentorOwnsGroup(g, mentorID) {
		return nil, Forbidden("Siz ushbu guruhga biriktirilmagansiz")
	}
	course, err := s.courses.GetByID(ctx, g.CourseID)
	if err != nil {
		return nil, err
	}

	if in.Date != nil {
		d, err := parseDate(*in.Date)
		if err != nil {
			return nil, BadRequest("Yaroqsiz sana")
		}
		l.Date = d
	}
	if in.Topic != nil {
		l.Topic = *in.Topic
	}
	if in.Kind != nil {
		l.Kind = models.LessonKind(*in.Kind)
	}
	if in.Status != nil {
		l.Status = models.LessonStatus(*in.Status)
	}

	// Sana belgilangan oylik davr ichida bo'lishi shart.
	entry := course.PriceEntryForDate(l.Date)
	if len(course.PriceEntries) > 0 && entry == nil {
		return nil, BadRequest("Dars sanasi belgilangan oylik davrlardan tashqarida")
	}
	kind := l.Kind
	if kind == "" {
		kind = models.LessonMain
	}
	// Asosiy dars limiti (o'zidan tashqari hisoblaymiz).
	if kind == models.LessonMain && entry != nil && course.LessonsPerMonth > 0 {
		count, err := s.countMainLessonsInRange(ctx, l.GroupID, entry.StartDate, entry.EndDate, l.ID)
		if err != nil {
			return nil, err
		}
		if count >= course.LessonsPerMonth {
			return nil, Conflict("Bu oy uchun asosiy darslar soni to'ldi (%d ta)", course.LessonsPerMonth)
		}
	}

	// Oy indeksi va narxni dars sanasiga ko'ra yangilaymiz.
	l.MonthIndex = computeMonthIndex(g.StartDate, l.Date, course.DurationMonths)
	monthlyPrice := course.PriceForMonth(l.MonthIndex)
	mentorRate := course.MentorRatePerStudent
	if entry != nil {
		monthlyPrice = entry.Price
		mentorRate = entry.MentorRate
	}
	if course.LessonsPerMonth > 0 {
		l.StudentLessonPrice = monthlyPrice / int64(course.LessonsPerMonth)
	}
	l.MentorRateSnapshot = mentorRate

	if err := s.lessons.Update(ctx, l); err != nil {
		return nil, err
	}

	if in.HomeworkTitle != nil || in.HomeworkDescription != nil {
		hw, _ := s.homeworks.GetByLesson(ctx, lessonID)
		if hw == nil {
			hw = &models.Homework{LessonID: lessonID, GroupID: l.GroupID}
			if in.HomeworkTitle != nil {
				hw.Title = *in.HomeworkTitle
			}
			if in.HomeworkDescription != nil {
				hw.Description = *in.HomeworkDescription
			}
			_ = s.homeworks.Create(ctx, hw)
		} else {
			if in.HomeworkTitle != nil {
				hw.Title = *in.HomeworkTitle
			}
			if in.HomeworkDescription != nil {
				hw.Description = *in.HomeworkDescription
			}
			_ = s.homeworks.Update(ctx, hw)
		}
	}
	return l, nil
}

// DeleteLesson removes a lesson and its dependent records.
func (s *JournalService) DeleteLesson(ctx context.Context, lessonID, mentorID primitive.ObjectID, isAdmin bool) error {
	l, err := s.GetLesson(ctx, lessonID)
	if err != nil {
		return err
	}
	if !isAdmin {
		g, err := s.groups.GetByID(ctx, l.GroupID)
		if err != nil {
			return err
		}
		if !MentorOwnsGroup(g, mentorID) {
			return Forbidden("Siz ushbu guruhga biriktirilmagansiz")
		}
	}
	_ = s.attendances.DeleteByLesson(ctx, lessonID)
	_ = s.grades.DeleteByLesson(ctx, lessonID)
	_ = s.homeworks.DeleteByLesson(ctx, lessonID)
	return s.lessons.Delete(ctx, lessonID)
}

// AttendanceItem is one student's attendance in a bulk submission.
type AttendanceItem struct {
	StudentID string `json:"studentId" validate:"required"`
	Status    string `json:"status" validate:"required,oneof=present late excused absent"`
}

// SetAttendance bulk-sets attendance for a lesson.
func (s *JournalService) SetAttendance(ctx context.Context, lessonID, mentorID primitive.ObjectID, isAdmin bool, items []AttendanceItem) error {
	l, err := s.GetLesson(ctx, lessonID)
	if err != nil {
		return err
	}
	g, err := s.groups.GetByID(ctx, l.GroupID)
	if err != nil {
		return err
	}
	if !isAdmin && !MentorOwnsGroup(g, mentorID) {
		return Forbidden("Siz ushbu guruhga biriktirilmagansiz")
	}
	for _, it := range items {
		sid, err := primitive.ObjectIDFromHex(it.StudentID)
		if err != nil {
			return BadRequest("Yaroqsiz o'quvchi identifikatori")
		}
		status := models.AttendanceStatus(it.Status)
		a := &models.Attendance{
			LessonID:  lessonID,
			StudentID: sid,
			GroupID:   l.GroupID,
			Status:    status,
			MarkedBy:  mentorID,
		}
		if err := s.attendances.Upsert(ctx, a); err != nil {
			return err
		}
		// If a student is not present/late, remove any existing grades (gate rule).
		if !status.Billable() {
			_ = s.grades.DeleteByLessonStudent(ctx, lessonID, sid)
		}
	}
	return nil
}

// GradeItem is one student's grade in a bulk submission.
// Score 0 means "no grade" — any existing grade of that type is removed.
type GradeItem struct {
	StudentID string `json:"studentId" validate:"required"`
	Type      string `json:"type" validate:"required,oneof=homework participation"`
	Score     int    `json:"score" validate:"min=0,max=10"`
}

// SetGrades bulk-sets grades; only students marked present/late may be graded.
func (s *JournalService) SetGrades(ctx context.Context, lessonID, mentorID primitive.ObjectID, isAdmin bool, items []GradeItem) error {
	l, err := s.GetLesson(ctx, lessonID)
	if err != nil {
		return err
	}
	g, err := s.groups.GetByID(ctx, l.GroupID)
	if err != nil {
		return err
	}
	if !isAdmin && !MentorOwnsGroup(g, mentorID) {
		return Forbidden("Siz ushbu guruhga biriktirilmagansiz")
	}

	// Build attendance lookup for the gate.
	atts, err := s.attendances.ListByLesson(ctx, lessonID)
	if err != nil {
		return err
	}
	billable := map[primitive.ObjectID]bool{}
	for _, a := range atts {
		billable[a.StudentID] = a.Status.Billable()
	}

	for _, it := range items {
		sid, err := primitive.ObjectIDFromHex(it.StudentID)
		if err != nil {
			return BadRequest("Yaroqsiz o'quvchi identifikatori")
		}
		if !billable[sid] {
			return BadRequest("Faqat darsda qatnashgan o'quvchilarga baho qo'yish mumkin")
		}
		gtype := models.GradeType(it.Type)
		// Score 0 => bahoni o'chirish (bo'sh qoldirilgan).
		if it.Score == 0 {
			if err := s.grades.DeleteByLessonStudentType(ctx, lessonID, sid, gtype); err != nil {
				return err
			}
			continue
		}
		gr := &models.Grade{
			LessonID:  lessonID,
			StudentID: sid,
			GroupID:   l.GroupID,
			Type:      gtype,
			Score:     it.Score,
			GradedBy:  mentorID,
		}
		if err := s.grades.Upsert(ctx, gr); err != nil {
			return err
		}
	}
	return nil
}

// LessonRoster bundles attendance + grades for a lesson (mentor/admin view).
type LessonRoster struct {
	Attendances []models.Attendance `json:"attendances"`
	Grades      []models.Grade      `json:"grades"`
}

func (s *JournalService) LessonRoster(ctx context.Context, lessonID primitive.ObjectID) (*LessonRoster, error) {
	atts, err := s.attendances.ListByLesson(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	grades, err := s.grades.ListByLesson(ctx, lessonID)
	if err != nil {
		return nil, err
	}
	return &LessonRoster{Attendances: atts, Grades: grades}, nil
}
