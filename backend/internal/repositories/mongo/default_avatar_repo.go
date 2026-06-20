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

type defaultAvatarRepo struct {
	c *mongo.Collection
}

func NewDefaultAvatarRepo(db *mongo.Database) repositories.DefaultAvatarRepository {
	return &defaultAvatarRepo{c: db.Collection(colDefaultAvatars)}
}

func (r *defaultAvatarRepo) Create(ctx context.Context, a *models.DefaultAvatar) error {
	a.CreatedAt = time.Now()
	res, err := r.c.InsertOne(ctx, a)
	if err != nil {
		return err
	}
	a.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *defaultAvatarRepo) List(ctx context.Context) ([]models.DefaultAvatar, error) {
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cur, err := r.c.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.DefaultAvatar{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *defaultAvatarRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.DefaultAvatar, error) {
	var a models.DefaultAvatar
	err := r.c.FindOne(ctx, bson.M{"_id": id}).Decode(&a)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *defaultAvatarRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.c.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

// RandomForGender samples a single avatar matching the gender (or "both");
// returns (nil, nil) when none is available.
func (r *defaultAvatarRepo) RandomForGender(ctx context.Context, gender string) (*models.DefaultAvatar, error) {
	match := bson.D{}
	if gender == "male" || gender == "female" {
		// gender mos keladigan yoki "both" (ikkalasi) rasmlardan tanlaymiz.
		match = bson.D{{Key: "gender", Value: bson.D{{Key: "$in", Value: bson.A{gender, "both"}}}}}
	}
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$sample", Value: bson.D{{Key: "size", Value: 1}}}},
	}
	cur, err := r.c.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	if !cur.Next(ctx) {
		return nil, nil // empty library
	}
	var a models.DefaultAvatar
	if err := cur.Decode(&a); err != nil {
		return nil, err
	}
	return &a, nil
}
