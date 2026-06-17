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

type groupRepo struct {
	c *mongo.Collection
}

func NewGroupRepo(db *mongo.Database) repositories.GroupRepository {
	return &groupRepo{c: db.Collection(colGroups)}
}

func (r *groupRepo) Create(ctx context.Context, g *models.Group) error {
	now := time.Now()
	g.CreatedAt, g.UpdatedAt = now, now
	if g.MentorIDs == nil {
		g.MentorIDs = []primitive.ObjectID{}
	}
	res, err := r.c.InsertOne(ctx, g)
	if err != nil {
		return err
	}
	g.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *groupRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Group, error) {
	var g models.Group
	err := r.c.FindOne(ctx, bson.M{"_id": id}).Decode(&g)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *groupRepo) List(ctx context.Context, status string, p repositories.Page) ([]models.Group, int64, error) {
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
	out := []models.Group{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *groupRepo) ListByMentor(ctx context.Context, mentorID primitive.ObjectID, p repositories.Page) ([]models.Group, int64, error) {
	filter := bson.M{"mentorIds": mentorID}
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
	out := []models.Group{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *groupRepo) ListByIDs(ctx context.Context, ids []primitive.ObjectID) ([]models.Group, error) {
	if len(ids) == 0 {
		return []models.Group{}, nil
	}
	cur, err := r.c.Find(ctx, bson.M{"_id": bson.M{"$in": ids}})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.Group{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *groupRepo) Update(ctx context.Context, g *models.Group) error {
	g.UpdatedAt = time.Now()
	_, err := r.c.UpdateOne(ctx, bson.M{"_id": g.ID}, bson.M{"$set": bson.M{
		"name":         g.Name,
		"courseId":     g.CourseID,
		"mentorIds":    g.MentorIDs,
		"studentLimit": g.StudentLimit,
		"schedule":     g.Schedule,
		"startDate":    g.StartDate,
		"status":       g.Status,
		"updatedAt":    g.UpdatedAt,
	}})
	return err
}

func (r *groupRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.c.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *groupRepo) Count(ctx context.Context) (int64, error) {
	return r.c.CountDocuments(ctx, bson.M{})
}
