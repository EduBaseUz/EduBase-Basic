package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"edubase/backend/internal/config"
	"edubase/backend/internal/handlers"
	mongorepo "edubase/backend/internal/repositories/mongo"
	"edubase/backend/internal/server"
	"edubase/backend/internal/services"
	"edubase/backend/pkg/jwt"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg := config.Load()

	ctx := context.Background()
	client, err := mongorepo.Connect(ctx, cfg.MongoURI)
	if err != nil {
		slog.Error("mongo connect failed", "err", err.Error())
		os.Exit(1)
	}
	defer func() {
		_ = client.Disconnect(context.Background())
	}()

	db := client.Database(cfg.MongoDB)
	if err := mongorepo.EnsureIndexes(ctx, db); err != nil {
		slog.Error("ensure indexes failed", "err", err.Error())
		os.Exit(1)
	}

	repos := mongorepo.NewRepositories(db)
	jwtMgr := jwt.NewManager(cfg.AccessSecret, cfg.RefreshSecret, cfg.AccessTTL, cfg.RefreshTTL)
	svc := services.New(repos, jwtMgr)
	h := handlers.New(svc, jwtMgr, cfg)

	router := server.New(cfg, h, jwtMgr, repos.Users)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("server starting", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "err", err.Error())
			os.Exit(1)
		}
	}()

	// Graceful shutdown.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	slog.Info("server shutting down")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown failed", "err", err.Error())
	}
}
