package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DefaultAvatar is a reusable avatar image stored in the system's avatar
// library. When a user is created without their own avatar, one of these is
// assigned at random.
type DefaultAvatar struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	URL       string             `bson:"url" json:"url"`
	Key       string             `bson:"key" json:"key"`       // S3 object key (internal)
	Gender    string             `bson:"gender" json:"gender"` // male | female | both
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}
