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

type homeworkRepo struct {
	c *mongo.Collection
}

func NewHomeworkRepo(db *mongo.Database) repositories.HomeworkRepository {
	return &homeworkRepo{c: db.Collection(colHomeworks)}
}

func (r *homeworkRepo) Create(ctx context.Context, h *models.Homework) error {
	now := time.Now()
	h.CreatedAt, h.UpdatedAt = now, now
	res, err := r.c.InsertOne(ctx, h)
	if err != nil {
		return err
	}
	h.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *homeworkRepo) GetByLesson(ctx context.Context, lessonID primitive.ObjectID) (*models.Homework, error) {
	var h models.Homework
	err := r.c.FindOne(ctx, bson.M{"lessonId": lessonID}).Decode(&h)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &h, nil
}

func (r *homeworkRepo) ListByGroup(ctx context.Context, groupID primitive.ObjectID) ([]models.Homework, error) {
	cur, err := r.c.Find(ctx, bson.M{"groupId": groupID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.Homework{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *homeworkRepo) Update(ctx context.Context, h *models.Homework) error {
	h.UpdatedAt = time.Now()
	_, err := r.c.UpdateOne(ctx, bson.M{"_id": h.ID}, bson.M{"$set": bson.M{
		"title":       h.Title,
		"description": h.Description,
		"updatedAt":   h.UpdatedAt,
	}})
	return err
}

func (r *homeworkRepo) DeleteByLesson(ctx context.Context, lessonID primitive.ObjectID) error {
	_, err := r.c.DeleteMany(ctx, bson.M{"lessonId": lessonID})
	return err
}
