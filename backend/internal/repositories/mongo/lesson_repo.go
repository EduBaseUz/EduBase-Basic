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

type lessonRepo struct {
	c *mongo.Collection
}

func NewLessonRepo(db *mongo.Database) repositories.LessonRepository {
	return &lessonRepo{c: db.Collection(colLessons)}
}

func (r *lessonRepo) Create(ctx context.Context, l *models.Lesson) error {
	now := time.Now()
	l.CreatedAt, l.UpdatedAt = now, now
	res, err := r.c.InsertOne(ctx, l)
	if err != nil {
		return err
	}
	l.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *lessonRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Lesson, error) {
	var l models.Lesson
	err := r.c.FindOne(ctx, bson.M{"_id": id}).Decode(&l)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *lessonRepo) ListByGroup(ctx context.Context, groupID primitive.ObjectID, p repositories.Page) ([]models.Lesson, int64, error) {
	filter := bson.M{"groupId": groupID}
	total, err := r.c.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip(p.Skip()).SetLimit(int64(p.Limit)).SetSort(bson.D{{Key: "date", Value: -1}})
	cur, err := r.c.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	out := []models.Lesson{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *lessonRepo) ListByGroupAll(ctx context.Context, groupID primitive.ObjectID) ([]models.Lesson, error) {
	return r.find(ctx, bson.M{"groupId": groupID})
}

func (r *lessonRepo) ListByMentor(ctx context.Context, mentorID primitive.ObjectID) ([]models.Lesson, error) {
	return r.find(ctx, bson.M{"conductedByMentorId": mentorID})
}

func (r *lessonRepo) ListByMentorPeriod(ctx context.Context, mentorID primitive.ObjectID, from, to time.Time) ([]models.Lesson, error) {
	return r.find(ctx, bson.M{
		"conductedByMentorId": mentorID,
		"date":                bson.M{"$gte": from, "$lt": to},
	})
}

func (r *lessonRepo) Update(ctx context.Context, l *models.Lesson) error {
	l.UpdatedAt = time.Now()
	_, err := r.c.UpdateOne(ctx, bson.M{"_id": l.ID}, bson.M{"$set": bson.M{
		"date":               l.Date,
		"topic":              l.Topic,
		"kind":               l.Kind,
		"monthIndex":         l.MonthIndex,
		"studentLessonPrice": l.StudentLessonPrice,
		"mentorRateSnapshot": l.MentorRateSnapshot,
		"status":             l.Status,
		"updatedAt":          l.UpdatedAt,
	}})
	return err
}

func (r *lessonRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.c.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *lessonRepo) Count(ctx context.Context) (int64, error) {
	return r.c.CountDocuments(ctx, bson.M{})
}

func (r *lessonRepo) find(ctx context.Context, filter bson.M) ([]models.Lesson, error) {
	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}})
	cur, err := r.c.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.Lesson{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
