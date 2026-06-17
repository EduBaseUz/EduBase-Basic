package mongo

import (
	"context"
	"time"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type attendanceRepo struct {
	c *mongo.Collection
}

func NewAttendanceRepo(db *mongo.Database) repositories.AttendanceRepository {
	return &attendanceRepo{c: db.Collection(colAttendances)}
}

// Upsert creates or updates the attendance for a (lesson, student) pair.
func (r *attendanceRepo) Upsert(ctx context.Context, a *models.Attendance) error {
	now := time.Now()
	a.UpdatedAt = now
	filter := bson.M{"lessonId": a.LessonID, "studentId": a.StudentID}
	update := bson.M{
		"$set": bson.M{
			"groupId":   a.GroupID,
			"status":    a.Status,
			"markedBy":  a.MarkedBy,
			"updatedAt": now,
		},
		"$setOnInsert": bson.M{"createdAt": now},
	}
	_, err := r.c.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}

func (r *attendanceRepo) ListByLesson(ctx context.Context, lessonID primitive.ObjectID) ([]models.Attendance, error) {
	return r.find(ctx, bson.M{"lessonId": lessonID})
}

func (r *attendanceRepo) ListByGroup(ctx context.Context, groupID primitive.ObjectID) ([]models.Attendance, error) {
	return r.find(ctx, bson.M{"groupId": groupID})
}

func (r *attendanceRepo) ListByStudentGroup(ctx context.Context, studentID, groupID primitive.ObjectID) ([]models.Attendance, error) {
	return r.find(ctx, bson.M{"studentId": studentID, "groupId": groupID})
}

func (r *attendanceRepo) ListByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.Attendance, error) {
	return r.find(ctx, bson.M{"studentId": studentID})
}

func (r *attendanceRepo) DeleteByLesson(ctx context.Context, lessonID primitive.ObjectID) error {
	_, err := r.c.DeleteMany(ctx, bson.M{"lessonId": lessonID})
	return err
}

func (r *attendanceRepo) find(ctx context.Context, filter bson.M) ([]models.Attendance, error) {
	cur, err := r.c.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.Attendance{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
