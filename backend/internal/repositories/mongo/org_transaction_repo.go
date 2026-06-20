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

type orgTransactionRepo struct {
	c *mongo.Collection
}

func NewOrgTransactionRepo(db *mongo.Database) repositories.OrgTransactionRepository {
	return &orgTransactionRepo{c: db.Collection(colOrgTransactions)}
}

func (r *orgTransactionRepo) Create(ctx context.Context, t *models.OrgTransaction) error {
	now := time.Now()
	t.CreatedAt, t.UpdatedAt = now, now
	res, err := r.c.InsertOne(ctx, t)
	if err != nil {
		return err
	}
	t.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *orgTransactionRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.OrgTransaction, error) {
	var t models.OrgTransaction
	err := r.c.FindOne(ctx, bson.M{"_id": id}).Decode(&t)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *orgTransactionRepo) List(ctx context.Context, p repositories.Page) ([]models.OrgTransaction, int64, error) {
	total, err := r.c.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip(p.Skip()).SetLimit(int64(p.Limit)).SetSort(bson.D{{Key: "date", Value: -1}})
	cur, err := r.c.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	out := []models.OrgTransaction{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *orgTransactionRepo) Update(ctx context.Context, t *models.OrgTransaction) error {
	t.UpdatedAt = time.Now()
	_, err := r.c.UpdateOne(ctx, bson.M{"_id": t.ID}, bson.M{"$set": bson.M{
		"kind":      t.Kind,
		"category":  t.Category,
		"amount":    t.Amount,
		"comment":   t.Comment,
		"date":      t.Date,
		"updatedAt": t.UpdatedAt,
	}})
	return err
}

func (r *orgTransactionRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.c.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *orgTransactionRepo) All(ctx context.Context) ([]models.OrgTransaction, error) {
	cur, err := r.c.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.OrgTransaction{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
