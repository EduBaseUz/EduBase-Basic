// Package storage handles object storage (AWS S3) for user-uploaded files
// such as avatars.
package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awscfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Storage wraps an S3 client scoped to a single bucket.
type S3Storage struct {
	client  *s3.Client
	presign *s3.PresignClient
	bucket  string
	region  string
}

// NewS3Storage builds an S3-backed storage using static credentials.
func NewS3Storage(ctx context.Context, region, bucket, accessKey, secretKey string) (*S3Storage, error) {
	if region == "" || bucket == "" {
		return nil, fmt.Errorf("storage: region va bucket bo'sh bo'lmasligi kerak")
	}
	cfg, err := awscfg.LoadDefaultConfig(ctx,
		awscfg.WithRegion(region),
		awscfg.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("storage: aws config: %w", err)
	}
	client := s3.NewFromConfig(cfg)
	return &S3Storage{
		client:  client,
		presign: s3.NewPresignClient(client),
		bucket:  bucket,
		region:  region,
	}, nil
}

// PublicURL builds the canonical (virtual-hosted) object URL.
func (s *S3Storage) PublicURL(key string) string {
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key)
}

// Upload stores an object and returns its public URL. Avatars are small, so the
// body is buffered fully (PutObject needs a known length / seekable reader).
func (s *S3Storage) Upload(ctx context.Context, key string, body io.Reader, contentType string) (string, error) {
	data, err := io.ReadAll(body)
	if err != nil {
		return "", fmt.Errorf("storage: read body: %w", err)
	}
	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(s.bucket),
		Key:           aws.String(key),
		Body:          bytes.NewReader(data),
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(int64(len(data))),
		CacheControl:  aws.String("public, max-age=31536000, immutable"),
	})
	if err != nil {
		return "", fmt.Errorf("storage: put object: %w", err)
	}
	return s.PublicURL(key), nil
}

// Delete removes an object. Best-effort; an empty key is a no-op.
func (s *S3Storage) Delete(ctx context.Context, key string) error {
	if key == "" {
		return nil
	}
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	return err
}

// PresignGet returns a temporary, signed GET URL. Useful later if the bucket is
// kept private instead of public.
func (s *S3Storage) PresignGet(ctx context.Context, key string, ttl time.Duration) (string, error) {
	out, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", err
	}
	return out.URL, nil
}
