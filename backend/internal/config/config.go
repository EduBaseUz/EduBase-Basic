package config

import (
	"log/slog"
	"os"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration, sourced from environment variables.
type Config struct {
	Port           string
	MongoURI       string
	MongoDB        string
	AccessSecret   string
	RefreshSecret  string
	AccessTTL      time.Duration
	RefreshTTL     time.Duration
	FrontendOrigin string
	CookieDomain   string

	// AWS S3 (avatar / fayl saqlash)
	AWSRegion    string
	S3Bucket     string
	AWSAccessKey string
	AWSSecretKey string
}

// Load reads configuration from the environment. A local .env file is loaded if present.
func Load() *Config {
	// Best-effort load of a local .env; ignored in production where vars are real env.
	_ = godotenv.Load()

	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		MongoURI:       getEnv("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:        getEnv("MONGO_DB", "edubase"),
		AccessSecret:   getEnv("JWT_ACCESS_SECRET", ""),
		RefreshSecret:  getEnv("JWT_REFRESH_SECRET", ""),
		AccessTTL:      getDuration("ACCESS_TTL", 15*time.Minute),
		RefreshTTL:     getDuration("REFRESH_TTL", 168*time.Hour),
		FrontendOrigin: getEnv("FRONTEND_ORIGIN", "http://localhost:3000"),
		CookieDomain:   getEnv("COOKIE_DOMAIN", ""),

		AWSRegion:    getEnv("AWS_REGION", ""),
		S3Bucket:     getEnv("AWS_S3_BUCKET", ""),
		AWSAccessKey: getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
	}

	if cfg.AccessSecret == "" || cfg.RefreshSecret == "" {
		slog.Warn("JWT secrets are empty; set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET")
	}
	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
		slog.Warn("invalid duration env var, using fallback", "key", key, "value", v)
	}
	return fallback
}
