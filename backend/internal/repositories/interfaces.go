package repositories

import (
	"context"
	"time"

	"edubase/backend/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Page holds pagination parameters for list queries.
type Page struct {
	Page  int
	Limit int
}

// Skip returns the number of documents to skip.
func (p Page) Skip() int64 {
	if p.Page < 1 {
		p.Page = 1
	}
	return int64((p.Page - 1) * p.Limit)
}

// Normalize clamps page/limit to sane defaults.
func (p *Page) Normalize() {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 || p.Limit > 100 {
		p.Limit = 20
	}
}

// UserFilter narrows user list queries.
type UserFilter struct {
	Role   string
	Status string
	Search string // matches fullName or phone
}

// UserRepository persists users.
type UserRepository interface {
	Create(ctx context.Context, u *models.User) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	GetByPhone(ctx context.Context, phone string) (*models.User, error)
	List(ctx context.Context, f UserFilter, p Page) ([]models.User, int64, error)
	Update(ctx context.Context, u *models.User) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	PhoneExists(ctx context.Context, phone string, excludeID *primitive.ObjectID) (bool, error)
	CountByRole(ctx context.Context, role models.Role) (int64, error)
	ListByParent(ctx context.Context, parentID primitive.ObjectID) ([]models.User, error)
}

// CourseRepository persists courses.
type CourseRepository interface {
	Create(ctx context.Context, c *models.Course) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Course, error)
	List(ctx context.Context, status string, p Page) ([]models.Course, int64, error)
	Update(ctx context.Context, c *models.Course) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	Count(ctx context.Context) (int64, error)
}

// GroupRepository persists groups.
type GroupRepository interface {
	Create(ctx context.Context, g *models.Group) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Group, error)
	List(ctx context.Context, status string, p Page) ([]models.Group, int64, error)
	ListByMentor(ctx context.Context, mentorID primitive.ObjectID, p Page) ([]models.Group, int64, error)
	ListByIDs(ctx context.Context, ids []primitive.ObjectID) ([]models.Group, error)
	Update(ctx context.Context, g *models.Group) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	Count(ctx context.Context) (int64, error)
}

// EnrollmentRepository persists student-group links.
type EnrollmentRepository interface {
	Create(ctx context.Context, e *models.Enrollment) error
	Get(ctx context.Context, studentID, groupID primitive.ObjectID) (*models.Enrollment, error)
	ListByGroup(ctx context.Context, groupID primitive.ObjectID) ([]models.Enrollment, error)
	ListByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.Enrollment, error)
	ActiveByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.Enrollment, error)
	CountActiveByGroup(ctx context.Context, groupID primitive.ObjectID) (int64, error)
	Update(ctx context.Context, e *models.Enrollment) error
	Delete(ctx context.Context, id primitive.ObjectID) error
}

// LessonRepository persists lessons.
type LessonRepository interface {
	Create(ctx context.Context, l *models.Lesson) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Lesson, error)
	ListByGroup(ctx context.Context, groupID primitive.ObjectID, p Page) ([]models.Lesson, int64, error)
	ListByGroupAll(ctx context.Context, groupID primitive.ObjectID) ([]models.Lesson, error)
	ListByMentor(ctx context.Context, mentorID primitive.ObjectID) ([]models.Lesson, error)
	ListByMentorPeriod(ctx context.Context, mentorID primitive.ObjectID, from, to time.Time) ([]models.Lesson, error)
	Update(ctx context.Context, l *models.Lesson) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	Count(ctx context.Context) (int64, error)
}

// HomeworkRepository persists homework.
type HomeworkRepository interface {
	Create(ctx context.Context, h *models.Homework) error
	GetByLesson(ctx context.Context, lessonID primitive.ObjectID) (*models.Homework, error)
	ListByGroup(ctx context.Context, groupID primitive.ObjectID) ([]models.Homework, error)
	Update(ctx context.Context, h *models.Homework) error
	DeleteByLesson(ctx context.Context, lessonID primitive.ObjectID) error
}

// AttendanceRepository persists attendance records.
type AttendanceRepository interface {
	Upsert(ctx context.Context, a *models.Attendance) error
	ListByLesson(ctx context.Context, lessonID primitive.ObjectID) ([]models.Attendance, error)
	ListByGroup(ctx context.Context, groupID primitive.ObjectID) ([]models.Attendance, error)
	ListByStudentGroup(ctx context.Context, studentID, groupID primitive.ObjectID) ([]models.Attendance, error)
	ListByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.Attendance, error)
	DeleteByLesson(ctx context.Context, lessonID primitive.ObjectID) error
}

// GradeRepository persists grades.
type GradeRepository interface {
	Upsert(ctx context.Context, g *models.Grade) error
	ListByLesson(ctx context.Context, lessonID primitive.ObjectID) ([]models.Grade, error)
	ListByGroup(ctx context.Context, groupID primitive.ObjectID) ([]models.Grade, error)
	ListByStudentGroup(ctx context.Context, studentID, groupID primitive.ObjectID) ([]models.Grade, error)
	ListByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.Grade, error)
	DeleteByLesson(ctx context.Context, lessonID primitive.ObjectID) error
	DeleteByLessonStudent(ctx context.Context, lessonID, studentID primitive.ObjectID) error
	DeleteByLessonStudentType(ctx context.Context, lessonID, studentID primitive.ObjectID, gtype models.GradeType) error
}

// TuitionRepository persists tuition ledgers.
type TuitionRepository interface {
	Create(ctx context.Context, t *models.TuitionLedger) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.TuitionLedger, error)
	GetByKey(ctx context.Context, studentID, groupID primitive.ObjectID, period string) (*models.TuitionLedger, error)
	List(ctx context.Context, period string, p Page) ([]models.TuitionLedger, int64, error)
	ListByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.TuitionLedger, error)
	Update(ctx context.Context, t *models.TuitionLedger) error
	All(ctx context.Context) ([]models.TuitionLedger, error)
}

// PayoutRepository persists mentor payouts.
type PayoutRepository interface {
	Create(ctx context.Context, p *models.Payout) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Payout, error)
	GetByKey(ctx context.Context, mentorID primitive.ObjectID, period string) (*models.Payout, error)
	List(ctx context.Context, period string, p Page) ([]models.Payout, int64, error)
	ListByMentor(ctx context.Context, mentorID primitive.ObjectID) ([]models.Payout, error)
	Update(ctx context.Context, p *models.Payout) error
	All(ctx context.Context) ([]models.Payout, error)
}

// Repositories bundles all repositories for easy injection.
type Repositories struct {
	Users       UserRepository
	Courses     CourseRepository
	Groups      GroupRepository
	Enrollments EnrollmentRepository
	Lessons     LessonRepository
	Homeworks   HomeworkRepository
	Attendances AttendanceRepository
	Grades      GradeRepository
	Tuition     TuitionRepository
	Payouts     PayoutRepository
}
