package mongo

import (
	"context"
	"time"

	"edubase/backend/internal/repositories"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Collection names.
const (
	colUsers       = "users"
	colCourses     = "courses"
	colGroups      = "groups"
	colEnrollments = "enrollments"
	colLessons     = "lessons"
	colHomeworks   = "homeworks"
	colAttendances = "attendances"
	colGrades      = "grades"
	colTuition     = "tuition_ledgers"
	colPayouts     = "payouts"
)

// Connect opens a MongoDB client and verifies connectivity.
func Connect(ctx context.Context, uri string) (*mongo.Client, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}
	return client, nil
}

// NewRepositories wires Mongo-backed repositories.
func NewRepositories(db *mongo.Database) *repositories.Repositories {
	return &repositories.Repositories{
		Users:       NewUserRepo(db),
		Courses:     NewCourseRepo(db),
		Groups:      NewGroupRepo(db),
		Enrollments: NewEnrollmentRepo(db),
		Lessons:     NewLessonRepo(db),
		Homeworks:   NewHomeworkRepo(db),
		Attendances: NewAttendanceRepo(db),
		Grades:      NewGradeRepo(db),
		Tuition:     NewTuitionRepo(db),
		Payouts:     NewPayoutRepo(db),
	}
}

// EnsureIndexes creates all required indexes (idempotent).
func EnsureIndexes(ctx context.Context, db *mongo.Database) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	specs := map[string][]mongo.IndexModel{
		colUsers: {
			{Keys: bson.D{{Key: "phone", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "role", Value: 1}}},
		},
		colEnrollments: {
			{Keys: bson.D{{Key: "studentId", Value: 1}, {Key: "groupId", Value: 1}}},
		},
		colLessons: {
			{Keys: bson.D{{Key: "groupId", Value: 1}, {Key: "date", Value: 1}}},
			{Keys: bson.D{{Key: "conductedByMentorId", Value: 1}}},
		},
		colAttendances: {
			{Keys: bson.D{{Key: "lessonId", Value: 1}, {Key: "studentId", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "studentId", Value: 1}, {Key: "groupId", Value: 1}}},
		},
		colGrades: {
			{Keys: bson.D{{Key: "studentId", Value: 1}, {Key: "groupId", Value: 1}}},
			{Keys: bson.D{{Key: "lessonId", Value: 1}, {Key: "studentId", Value: 1}, {Key: "type", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
		colTuition: {
			{Keys: bson.D{{Key: "studentId", Value: 1}, {Key: "period", Value: 1}}},
			{Keys: bson.D{{Key: "studentId", Value: 1}, {Key: "groupId", Value: 1}, {Key: "period", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
		colPayouts: {
			{Keys: bson.D{{Key: "mentorId", Value: 1}, {Key: "period", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
		colGroups: {
			{Keys: bson.D{{Key: "mentorIds", Value: 1}}},
		},
	}

	for col, models := range specs {
		if _, err := db.Collection(col).Indexes().CreateMany(ctx, models); err != nil {
			return err
		}
	}
	return nil
}
