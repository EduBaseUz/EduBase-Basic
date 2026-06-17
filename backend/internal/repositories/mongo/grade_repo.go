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

type gradeRepo struct {
	c *mongo.Collection
}

func NewGradeRepo(db *mongo.Database) repositories.GradeRepository {
	return &gradeRepo{c: db.Collection(colGrades)}
}

// Upsert creates or updates a grade for a (lesson, student, type) triple.
func (r *gradeRepo) Upsert(ctx context.Context, g *models.Grade) error {
	now := time.Now()
	g.UpdatedAt = now
	filter := bson.M{"lessonId": g.LessonID, "studentId": g.StudentID, "type": g.Type}
	update := bson.M{
		"$set": bson.M{
			"groupId":   g.GroupID,
			"score":     g.Score,
			"gradedBy":  g.GradedBy,
			"updatedAt": now,
		},
		"$setOnInsert": bson.M{"createdAt": now},
	}
	_, err := r.c.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	return err
}

func (r *gradeRepo) ListByLesson(ctx context.Context, lessonID primitive.ObjectID) ([]models.Grade, error) {
	return r.find(ctx, bson.M{"lessonId": lessonID})
}

func (r *gradeRepo) ListByGroup(ctx context.Context, groupID primitive.ObjectID) ([]models.Grade, error) {
	return r.find(ctx, bson.M{"groupId": groupID})
}

func (r *gradeRepo) ListByStudentGroup(ctx context.Context, studentID, groupID primitive.ObjectID) ([]models.Grade, error) {
	return r.find(ctx, bson.M{"studentId": studentID, "groupId": groupID})
}

func (r *gradeRepo) ListByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.Grade, error) {
	return r.find(ctx, bson.M{"studentId": studentID})
}

func (r *gradeRepo) DeleteByLesson(ctx context.Context, lessonID primitive.ObjectID) error {
	_, err := r.c.DeleteMany(ctx, bson.M{"lessonId": lessonID})
	return err
}

func (r *gradeRepo) DeleteByLessonStudent(ctx context.Context, lessonID, studentID primitive.ObjectID) error {
	_, err := r.c.DeleteMany(ctx, bson.M{"lessonId": lessonID, "studentId": studentID})
	return err
}

func (r *gradeRepo) DeleteByLessonStudentType(ctx context.Context, lessonID, studentID primitive.ObjectID, gtype models.GradeType) error {
	_, err := r.c.DeleteMany(ctx, bson.M{"lessonId": lessonID, "studentId": studentID, "type": gtype})
	return err
}

func (r *gradeRepo) find(ctx context.Context, filter bson.M) ([]models.Grade, error) {
	cur, err := r.c.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.Grade{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
