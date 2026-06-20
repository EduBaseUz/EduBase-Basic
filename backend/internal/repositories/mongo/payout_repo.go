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

type payoutRepo struct {
	c *mongo.Collection
}

func NewPayoutRepo(db *mongo.Database) repositories.PayoutRepository {
	return &payoutRepo{c: db.Collection(colPayouts)}
}

func (r *payoutRepo) Create(ctx context.Context, p *models.Payout) error {
	now := time.Now()
	p.CreatedAt, p.UpdatedAt = now, now
	if p.Transactions == nil {
		p.Transactions = []models.Transaction{}
	}
	res, err := r.c.InsertOne(ctx, p)
	if err != nil {
		return err
	}
	p.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *payoutRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Payout, error) {
	var p models.Payout
	err := r.c.FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *payoutRepo) GetByKey(ctx context.Context, mentorID primitive.ObjectID, period string) (*models.Payout, error) {
	var p models.Payout
	err := r.c.FindOne(ctx, bson.M{"mentorId": mentorID, "period": period}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *payoutRepo) GetByCourseKey(ctx context.Context, mentorID, courseID primitive.ObjectID, period string) (*models.Payout, error) {
	var p models.Payout
	err := r.c.FindOne(ctx, bson.M{"mentorId": mentorID, "courseId": courseID, "period": period}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *payoutRepo) List(ctx context.Context, period string, pg repositories.Page) ([]models.Payout, int64, error) {
	filter := bson.M{}
	if period != "" {
		filter["period"] = period
	}
	total, err := r.c.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip(pg.Skip()).SetLimit(int64(pg.Limit)).SetSort(bson.D{{Key: "updatedAt", Value: -1}})
	cur, err := r.c.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	out := []models.Payout{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *payoutRepo) ListByMentor(ctx context.Context, mentorID primitive.ObjectID) ([]models.Payout, error) {
	cur, err := r.c.Find(ctx, bson.M{"mentorId": mentorID}, options.Find().SetSort(bson.D{{Key: "period", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.Payout{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *payoutRepo) Update(ctx context.Context, p *models.Payout) error {
	p.UpdatedAt = time.Now()
	_, err := r.c.UpdateOne(ctx, bson.M{"_id": p.ID}, bson.M{"$set": bson.M{
		"earnedAmount": p.EarnedAmount,
		"transactions": p.Transactions,
		"status":       p.Status,
		"updatedAt":    p.UpdatedAt,
	}})
	return err
}

func (r *payoutRepo) All(ctx context.Context) ([]models.Payout, error) {
	cur, err := r.c.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.Payout{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
