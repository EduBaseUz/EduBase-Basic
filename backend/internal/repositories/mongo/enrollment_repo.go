package mongo

import (
	"context"
	"errors"
	"time"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type enrollmentRepo struct {
	c *mongo.Collection
}

func NewEnrollmentRepo(db *mongo.Database) repositories.EnrollmentRepository {
	return &enrollmentRepo{c: db.Collection(colEnrollments)}
}

func (r *enrollmentRepo) Create(ctx context.Context, e *models.Enrollment) error {
	now := time.Now()
	e.CreatedAt, e.UpdatedAt = now, now
	res, err := r.c.InsertOne(ctx, e)
	if err != nil {
		return err
	}
	e.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *enrollmentRepo) Get(ctx context.Context, studentID, groupID primitive.ObjectID) (*models.Enrollment, error) {
	var e models.Enrollment
	err := r.c.FindOne(ctx, bson.M{"studentId": studentID, "groupId": groupID}).Decode(&e)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *enrollmentRepo) ListByGroup(ctx context.Context, groupID primitive.ObjectID) ([]models.Enrollment, error) {
	return r.find(ctx, bson.M{"groupId": groupID})
}

func (r *enrollmentRepo) ListByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.Enrollment, error) {
	return r.find(ctx, bson.M{"studentId": studentID})
}

func (r *enrollmentRepo) ActiveByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.Enrollment, error) {
	return r.find(ctx, bson.M{"studentId": studentID, "status": models.EnrollmentActive})
}

func (r *enrollmentRepo) CountActiveByGroup(ctx context.Context, groupID primitive.ObjectID) (int64, error) {
	return r.c.CountDocuments(ctx, bson.M{"groupId": groupID, "status": models.EnrollmentActive})
}

func (r *enrollmentRepo) Update(ctx context.Context, e *models.Enrollment) error {
	e.UpdatedAt = time.Now()
	_, err := r.c.UpdateOne(ctx, bson.M{"_id": e.ID}, bson.M{"$set": bson.M{
		"joinedAt":  e.JoinedAt,
		"leftAt":    e.LeftAt,
		"status":    e.Status,
		"updatedAt": e.UpdatedAt,
	}})
	return err
}

func (r *enrollmentRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.c.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *enrollmentRepo) find(ctx context.Context, filter bson.M) ([]models.Enrollment, error) {
	cur, err := r.c.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.Enrollment{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
