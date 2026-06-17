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

type tuitionRepo struct {
	c *mongo.Collection
}

func NewTuitionRepo(db *mongo.Database) repositories.TuitionRepository {
	return &tuitionRepo{c: db.Collection(colTuition)}
}

func (r *tuitionRepo) Create(ctx context.Context, t *models.TuitionLedger) error {
	now := time.Now()
	t.CreatedAt, t.UpdatedAt = now, now
	if t.Transactions == nil {
		t.Transactions = []models.Transaction{}
	}
	res, err := r.c.InsertOne(ctx, t)
	if err != nil {
		return err
	}
	t.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *tuitionRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.TuitionLedger, error) {
	var t models.TuitionLedger
	err := r.c.FindOne(ctx, bson.M{"_id": id}).Decode(&t)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *tuitionRepo) GetByKey(ctx context.Context, studentID, groupID primitive.ObjectID, period string) (*models.TuitionLedger, error) {
	var t models.TuitionLedger
	err := r.c.FindOne(ctx, bson.M{"studentId": studentID, "groupId": groupID, "period": period}).Decode(&t)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *tuitionRepo) List(ctx context.Context, period string, p repositories.Page) ([]models.TuitionLedger, int64, error) {
	filter := bson.M{}
	if period != "" {
		filter["period"] = period
	}
	total, err := r.c.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip(p.Skip()).SetLimit(int64(p.Limit)).SetSort(bson.D{{Key: "updatedAt", Value: -1}})
	cur, err := r.c.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	out := []models.TuitionLedger{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *tuitionRepo) ListByStudent(ctx context.Context, studentID primitive.ObjectID) ([]models.TuitionLedger, error) {
	cur, err := r.c.Find(ctx, bson.M{"studentId": studentID}, options.Find().SetSort(bson.D{{Key: "period", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.TuitionLedger{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *tuitionRepo) Update(ctx context.Context, t *models.TuitionLedger) error {
	t.UpdatedAt = time.Now()
	_, err := r.c.UpdateOne(ctx, bson.M{"_id": t.ID}, bson.M{"$set": bson.M{
		"totalDue":     t.TotalDue,
		"discount":     t.Discount,
		"transactions": t.Transactions,
		"status":       t.Status,
		"updatedAt":    t.UpdatedAt,
	}})
	return err
}

func (r *tuitionRepo) All(ctx context.Context) ([]models.TuitionLedger, error) {
	cur, err := r.c.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.TuitionLedger{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
