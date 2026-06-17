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
	"go.mongodb.org/mongo-driver/mongo/options"
)

type courseRepo struct {
	c *mongo.Collection
}

func NewCourseRepo(db *mongo.Database) repositories.CourseRepository {
	return &courseRepo{c: db.Collection(colCourses)}
}

func (r *courseRepo) Create(ctx context.Context, c *models.Course) error {
	now := time.Now()
	c.CreatedAt, c.UpdatedAt = now, now
	res, err := r.c.InsertOne(ctx, c)
	if err != nil {
		return err
	}
	c.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *courseRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Course, error) {
	var c models.Course
	err := r.c.FindOne(ctx, bson.M{"_id": id}).Decode(&c)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *courseRepo) List(ctx context.Context, status string, p repositories.Page) ([]models.Course, int64, error) {
	filter := bson.M{}
	if status != "" {
		filter["status"] = status
	}
	total, err := r.c.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip(p.Skip()).SetLimit(int64(p.Limit)).SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cur, err := r.c.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	out := []models.Course{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *courseRepo) Update(ctx context.Context, c *models.Course) error {
	c.UpdatedAt = time.Now()
	_, err := r.c.UpdateOne(ctx, bson.M{"_id": c.ID}, bson.M{"$set": bson.M{
		"title":                c.Title,
		"description":          c.Description,
		"durationMonths":       c.DurationMonths,
		"monthlyPrices":        c.MonthlyPrices,
		"lessonsPerMonth":      c.LessonsPerMonth,
		"mentorRatePerStudent": c.MentorRatePerStudent,
		"mentorRateHistory":    c.MentorRateHistory,
		"status":               c.Status,
		"updatedAt":            c.UpdatedAt,
	}})
	return err
}

func (r *courseRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.c.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *courseRepo) Count(ctx context.Context) (int64, error) {
	return r.c.CountDocuments(ctx, bson.M{})
}
