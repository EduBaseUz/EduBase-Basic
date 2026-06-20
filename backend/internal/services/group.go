package services

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"edubase/backend/internal/repositories/mongo"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GroupService manages groups and enrollment (admin-only mutations).
type GroupService struct {
	groups      repositories.GroupRepository
	courses     repositories.CourseRepository
	users       repositories.UserRepository
	enrollments repositories.EnrollmentRepository
}

func NewGroupService(
	groups repositories.GroupRepository,
	courses repositories.CourseRepository,
	users repositories.UserRepository,
	enrollments repositories.EnrollmentRepository,
) *GroupService {
	return &GroupService{groups: groups, courses: courses, users: users, enrollments: enrollments}
}

// ScheduleInput mirrors models.Schedule for requests.
type ScheduleInput struct {
	Days      []string `json:"days" validate:"required,min=1,dive,oneof=mon tue wed thu fri sat sun"`
	StartTime string   `json:"startTime" validate:"required"`
	EndTime   string   `json:"endTime" validate:"required"`
	Room      string   `json:"room"`
}

// CreateGroupInput is the payload for creating a group.
type CreateGroupInput struct {
	Name         string        `json:"name" validate:"required,min=1"`
	CourseID     string        `json:"courseId" validate:"required"`
	MentorIDs    []string      `json:"mentorIds"`
	StudentLimit int           `json:"studentLimit" validate:"required,min=1"`
	Schedule     ScheduleInput `json:"schedule" validate:"required"`
	StartDate    string        `json:"startDate" validate:"required"` // RFC3339 or YYYY-MM-DD
}

// UpdateGroupInput is the payload for updating a group.
type UpdateGroupInput struct {
	Name         *string        `json:"name"`
	StudentLimit *int           `json:"studentLimit"`
	Schedule     *ScheduleInput `json:"schedule"`
	StartDate    *string        `json:"startDate"`
	Status       *string        `json:"status" validate:"omitempty,oneof=active finished paused"`
}

func parseDate(s string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02", s)
}

func parseObjectIDs(ids []string) ([]primitive.ObjectID, error) {
	out := make([]primitive.ObjectID, 0, len(ids))
	for _, s := range ids {
		id, err := primitive.ObjectIDFromHex(s)
		if err != nil {
			return nil, BadRequest("Yaroqsiz identifikator: %s", s)
		}
		out = append(out, id)
	}
	return out, nil
}

func (s *GroupService) Create(ctx context.Context, in CreateGroupInput) (*models.Group, error) {
	courseID, err := primitive.ObjectIDFromHex(in.CourseID)
	if err != nil {
		return nil, BadRequest("Yaroqsiz kurs identifikatori")
	}
	if _, err := s.courses.GetByID(ctx, courseID); err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("Kurs topilmadi")
		}
		return nil, err
	}
	startDate, err := parseDate(in.StartDate)
	if err != nil {
		return nil, BadRequest("Yaroqsiz boshlanish sanasi")
	}
	mentorIDs, err := parseObjectIDs(in.MentorIDs)
	if err != nil {
		return nil, err
	}
	if err := s.validateMentors(ctx, mentorIDs); err != nil {
		return nil, err
	}
	if err := validateTimeRange(in.Schedule.StartTime, in.Schedule.EndTime); err != nil {
		return nil, err
	}

	g := &models.Group{
		Name:         in.Name,
		CourseID:     courseID,
		MentorIDs:    mentorIDs,
		StudentLimit: in.StudentLimit,
		Schedule: models.Schedule{
			Days:      normalizeDays(in.Schedule.Days),
			StartTime: in.Schedule.StartTime,
			EndTime:   in.Schedule.EndTime,
			Room:      in.Schedule.Room,
		},
		StartDate: startDate,
		Status:    models.GroupActive,
	}
	if err := s.groups.Create(ctx, g); err != nil {
		return nil, err
	}
	return g, nil
}

func (s *GroupService) Get(ctx context.Context, id primitive.ObjectID) (*models.Group, error) {
	g, err := s.groups.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("Guruh topilmadi")
		}
		return nil, err
	}
	return g, nil
}

func (s *GroupService) List(ctx context.Context, status string, p repositories.Page) ([]models.Group, int64, error) {
	return s.groups.List(ctx, status, p)
}

func (s *GroupService) ListByMentor(ctx context.Context, mentorID primitive.ObjectID, p repositories.Page) ([]models.Group, int64, error) {
	return s.groups.ListByMentor(ctx, mentorID, p)
}

func (s *GroupService) Update(ctx context.Context, id primitive.ObjectID, in UpdateGroupInput) (*models.Group, error) {
	g, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if in.Name != nil {
		g.Name = *in.Name
	}
	if in.StudentLimit != nil {
		g.StudentLimit = *in.StudentLimit
	}
	if in.Schedule != nil {
		if err := validateTimeRange(in.Schedule.StartTime, in.Schedule.EndTime); err != nil {
			return nil, err
		}
		g.Schedule = models.Schedule{
			Days:      normalizeDays(in.Schedule.Days),
			StartTime: in.Schedule.StartTime,
			EndTime:   in.Schedule.EndTime,
			Room:      in.Schedule.Room,
		}
	}
	if in.StartDate != nil {
		d, err := parseDate(*in.StartDate)
		if err != nil {
			return nil, BadRequest("Yaroqsiz boshlanish sanasi")
		}
		g.StartDate = d
	}
	if in.Status != nil {
		g.Status = models.GroupStatus(*in.Status)
	}
	if err := s.groups.Update(ctx, g); err != nil {
		return nil, err
	}
	return g, nil
}

func (s *GroupService) Delete(ctx context.Context, id primitive.ObjectID) error {
	if _, err := s.Get(ctx, id); err != nil {
		return err
	}
	return s.groups.Delete(ctx, id)
}

// SetMentors replaces a group's mentor list.
func (s *GroupService) SetMentors(ctx context.Context, groupID primitive.ObjectID, mentorIDHexes []string) (*models.Group, error) {
	g, err := s.Get(ctx, groupID)
	if err != nil {
		return nil, err
	}
	mentorIDs, err := parseObjectIDs(mentorIDHexes)
	if err != nil {
		return nil, err
	}
	if err := s.validateMentors(ctx, mentorIDs); err != nil {
		return nil, err
	}
	g.MentorIDs = mentorIDs
	if err := s.groups.Update(ctx, g); err != nil {
		return nil, err
	}
	return g, nil
}

// AddStudent enrolls a student, validating duplicates, capacity and schedule clashes.
func (s *GroupService) AddStudent(ctx context.Context, groupID, studentID primitive.ObjectID) (*models.Enrollment, error) {
	g, err := s.Get(ctx, groupID)
	if err != nil {
		return nil, err
	}
	student, err := s.users.GetByID(ctx, studentID)
	if err != nil || student.Role != models.RoleStudent {
		return nil, NotFound("O'quvchi topilmadi")
	}

	// Duplicate check.
	if existing, err := s.enrollments.Get(ctx, studentID, groupID); err == nil {
		if existing.Status == models.EnrollmentActive {
			return nil, Conflict("O'quvchi ushbu guruhda allaqachon mavjud")
		}
		// Reactivate a previously left enrollment after clash checks below.
	} else if !errors.Is(err, mongo.ErrNotFound) {
		return nil, err
	}

	// Capacity check.
	count, err := s.enrollments.CountActiveByGroup(ctx, groupID)
	if err != nil {
		return nil, err
	}
	if int(count) >= g.StudentLimit {
		return nil, Conflict("Guruh to'lgan (limit: %d)", g.StudentLimit)
	}

	// Schedule clash check against the student's other active groups.
	if err := s.checkScheduleClash(ctx, studentID, g); err != nil {
		return nil, err
	}

	now := time.Now()
	// Reactivate if a left record exists, otherwise create new.
	if existing, err := s.enrollments.Get(ctx, studentID, groupID); err == nil {
		existing.Status = models.EnrollmentActive
		existing.JoinedAt = now
		existing.LeftAt = nil
		existing.Outcome = models.OutcomeNone
		if err := s.enrollments.Update(ctx, existing); err != nil {
			return nil, err
		}
		return existing, nil
	}

	e := &models.Enrollment{
		StudentID: studentID,
		GroupID:   groupID,
		JoinedAt:  now,
		Status:    models.EnrollmentActive,
	}
	if err := s.enrollments.Create(ctx, e); err != nil {
		return nil, err
	}
	return e, nil
}

// closeEnrollment marks a student's active enrollment in a group as left,
// recording the outcome (why they left) for history.
func (s *GroupService) closeEnrollment(ctx context.Context, groupID, studentID primitive.ObjectID, outcome models.EnrollmentOutcome) error {
	e, err := s.enrollments.Get(ctx, studentID, groupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return NotFound("Ro'yxatga olish topilmadi")
		}
		return err
	}
	now := time.Now()
	e.Status = models.EnrollmentLeft
	e.LeftAt = &now
	e.Outcome = outcome
	return s.enrollments.Update(ctx, e)
}

// RemoveStudent removes a student from a group (outcome: dropped).
func (s *GroupService) RemoveStudent(ctx context.Context, groupID, studentID primitive.ObjectID) error {
	return s.closeEnrollment(ctx, groupID, studentID, models.OutcomeDropped)
}

// ListEnrollments returns all enrollments (active + history) for a group.
func (s *GroupService) ListEnrollments(ctx context.Context, groupID primitive.ObjectID) ([]models.Enrollment, error) {
	return s.enrollments.ListByGroup(ctx, groupID)
}

// moveWithOutcome closes the source enrollment with the given outcome, then
// enrolls the student into the target group. On failure the source is restored.
func (s *GroupService) moveWithOutcome(ctx context.Context, fromGroupID, toGroupID, studentID primitive.ObjectID, outcome models.EnrollmentOutcome) error {
	if toGroupID == fromGroupID {
		return BadRequest("O'quvchi allaqachon shu guruhda")
	}
	if _, err := s.Get(ctx, toGroupID); err != nil {
		return err
	}
	// Close source first so schedule-clash checks ignore it.
	if err := s.closeEnrollment(ctx, fromGroupID, studentID, outcome); err != nil {
		return err
	}
	if _, err := s.AddStudent(ctx, toGroupID, studentID); err != nil {
		_, _ = s.AddStudent(ctx, fromGroupID, studentID) // restore
		return err
	}
	return nil
}

// MoveStudent moves a student to another group (plain transfer).
func (s *GroupService) MoveStudent(ctx context.Context, fromGroupID, studentID primitive.ObjectID, toGroupHex string) error {
	toGroupID, err := primitive.ObjectIDFromHex(toGroupHex)
	if err != nil {
		return BadRequest("Yaroqsiz guruh identifikatori")
	}
	return s.moveWithOutcome(ctx, fromGroupID, toGroupID, studentID, models.OutcomeTransferred)
}

// PromotionItem is one student's exam decision: pass/fail plus the target group.
type PromotionItem struct {
	StudentID     string
	Outcome       string // "passed" | "repeat"
	TargetGroupID string
}

// PromoteStudents applies a batch of exam decisions: each listed student is moved
// from this group to a target group, the source enrollment closed with the
// chosen outcome. Students who stay are simply not included.
func (s *GroupService) PromoteStudents(ctx context.Context, fromGroupID primitive.ObjectID, items []PromotionItem) error {
	for _, it := range items {
		outcome := models.EnrollmentOutcome(it.Outcome)
		if outcome != models.OutcomePassed && outcome != models.OutcomeRepeat {
			return BadRequest("Yaroqsiz natija turi")
		}
		sid, err := primitive.ObjectIDFromHex(it.StudentID)
		if err != nil {
			return BadRequest("Yaroqsiz o'quvchi identifikatori")
		}
		toID, err := primitive.ObjectIDFromHex(it.TargetGroupID)
		if err != nil {
			return BadRequest("Yaroqsiz maqsadli guruh identifikatori")
		}
		if err := s.moveWithOutcome(ctx, fromGroupID, toID, sid, outcome); err != nil {
			return err
		}
	}
	return nil
}

func (s *GroupService) validateMentors(ctx context.Context, ids []primitive.ObjectID) error {
	for _, id := range ids {
		u, err := s.users.GetByID(ctx, id)
		if err != nil || u.Role != models.RoleMentor {
			return BadRequest("Yaroqsiz mentor tanlandi")
		}
	}
	return nil
}

func (s *GroupService) checkScheduleClash(ctx context.Context, studentID primitive.ObjectID, target *models.Group) error {
	enrolls, err := s.enrollments.ActiveByStudent(ctx, studentID)
	if err != nil {
		return err
	}
	ids := make([]primitive.ObjectID, 0, len(enrolls))
	for _, e := range enrolls {
		ids = append(ids, e.GroupID)
	}
	others, err := s.groups.ListByIDs(ctx, ids)
	if err != nil {
		return err
	}
	for _, o := range others {
		if o.ID == target.ID || o.Status != models.GroupActive {
			continue
		}
		if schedulesClash(o.Schedule, target.Schedule) {
			return Conflict("Dars jadvali \"%s\" guruhi bilan to'qnashadi", o.Name)
		}
	}
	return nil
}

// --- schedule helpers ---

func normalizeDays(days []string) []string {
	out := make([]string, 0, len(days))
	for _, d := range days {
		out = append(out, strings.ToLower(strings.TrimSpace(d)))
	}
	return out
}

func toMinutes(hhmm string) (int, bool) {
	parts := strings.Split(hhmm, ":")
	if len(parts) != 2 {
		return 0, false
	}
	h, err1 := strconv.Atoi(parts[0])
	m, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil || h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, false
	}
	return h*60 + m, true
}

func validateTimeRange(start, end string) error {
	s, ok1 := toMinutes(start)
	e, ok2 := toMinutes(end)
	if !ok1 || !ok2 {
		return BadRequest("Yaroqsiz vaqt formati (HH:MM kutilmoqda)")
	}
	if s >= e {
		return BadRequest("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak")
	}
	return nil
}

func daysIntersect(a, b []string) bool {
	set := map[string]bool{}
	for _, d := range a {
		set[strings.ToLower(d)] = true
	}
	for _, d := range b {
		if set[strings.ToLower(d)] {
			return true
		}
	}
	return false
}

func schedulesClash(a, b models.Schedule) bool {
	if !daysIntersect(a.Days, b.Days) {
		return false
	}
	as, ok1 := toMinutes(a.StartTime)
	ae, ok2 := toMinutes(a.EndTime)
	bs, ok3 := toMinutes(b.StartTime)
	be, ok4 := toMinutes(b.EndTime)
	if !ok1 || !ok2 || !ok3 || !ok4 {
		return false
	}
	// Overlap if one starts before the other ends.
	return as < be && bs < ae
}
