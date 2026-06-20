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

// ErrNotFound is returned when a document does not exist.
var ErrNotFound = errors.New("not found")

type userRepo struct {
	c *mongo.Collection
}

func NewUserRepo(db *mongo.Database) repositories.UserRepository {
	return &userRepo{c: db.Collection(colUsers)}
}

func (r *userRepo) Create(ctx context.Context, u *models.User) error {
	now := time.Now()
	u.CreatedAt, u.UpdatedAt = now, now
	res, err := r.c.InsertOne(ctx, u)
	if err != nil {
		return err
	}
	u.ID = res.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *userRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var u models.User
	err := r.c.FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepo) GetByPhone(ctx context.Context, phone string) (*models.User, error) {
	var u models.User
	err := r.c.FindOne(ctx, bson.M{"phone": phone}).Decode(&u)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepo) List(ctx context.Context, f repositories.UserFilter, p repositories.Page) ([]models.User, int64, error) {
	filter := bson.M{}
	if f.Role != "" {
		filter["role"] = f.Role
	}
	if f.Status != "" {
		filter["status"] = f.Status
	}
	if f.Search != "" {
		filter["$or"] = bson.A{
			bson.M{"fullName": bson.M{"$regex": f.Search, "$options": "i"}},
			bson.M{"phone": bson.M{"$regex": f.Search, "$options": "i"}},
		}
	}

	total, err := r.c.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSkip(p.Skip()).
		SetLimit(int64(p.Limit)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cur, err := r.c.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)

	users := []models.User{}
	if err := cur.All(ctx, &users); err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

func (r *userRepo) Update(ctx context.Context, u *models.User) error {
	u.UpdatedAt = time.Now()
	_, err := r.c.UpdateOne(ctx, bson.M{"_id": u.ID}, bson.M{"$set": bson.M{
		"role":               u.Role,
		"lastName":           u.LastName,
		"firstName":          u.FirstName,
		"middleName":         u.MiddleName,
		"fullName":           u.FullName,
		"phone":              u.Phone,
		"gender":             u.Gender,
		"address":            u.Address,
		"avatarUrl":          u.AvatarURL,
		"avatarKey":          u.AvatarKey,
		"passwordHash":       u.PasswordHash,
		"mustChangePassword": u.MustChangePassword,
		"status":             u.Status,
		"noteCourseId":       u.NoteCourseID,
		"birthDate":          u.BirthDate,
		"documentType":       u.DocumentType,
		"documentSeries":     u.DocumentSeries,
		"documentNumber":     u.DocumentNumber,
		"specialization":     u.Specialization,
		"specializations":    u.Specializations,
		"parentId":           u.ParentID,
		"updatedAt":          u.UpdatedAt,
	}})
	return err
}

func (r *userRepo) ListByParent(ctx context.Context, parentID primitive.ObjectID) ([]models.User, error) {
	cur, err := r.c.Find(ctx, bson.M{"parentId": parentID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []models.User{}
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *userRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.c.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *userRepo) PhoneExists(ctx context.Context, phone string, excludeID *primitive.ObjectID) (bool, error) {
	filter := bson.M{"phone": phone}
	if excludeID != nil {
		filter["_id"] = bson.M{"$ne": *excludeID}
	}
	n, err := r.c.CountDocuments(ctx, filter)
	return n > 0, err
}

func (r *userRepo) CountByRole(ctx context.Context, role models.Role) (int64, error) {
	return r.c.CountDocuments(ctx, bson.M{"role": role})
}
