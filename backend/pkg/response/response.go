package response

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// Error codes used across the API.
const (
	CodeBadRequest   = "bad_request"
	CodeUnauthorized = "unauthorized"
	CodeForbidden    = "forbidden"
	CodeNotFound     = "not_found"
	CodeConflict     = "conflict"
	CodeInternal     = "internal_error"
	CodeValidation   = "validation_error"
	CodeRateLimited  = "rate_limited"
)

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

type dataEnvelope struct {
	Data any `json:"data"`
}

// JSON writes a success envelope: {"data": ...}.
func JSON(w http.ResponseWriter, status int, data any) {
	write(w, status, dataEnvelope{Data: data})
}

// Created is a convenience for 201 responses.
func Created(w http.ResponseWriter, data any) {
	JSON(w, http.StatusCreated, data)
}

// OK is a convenience for 200 responses.
func OK(w http.ResponseWriter, data any) {
	JSON(w, http.StatusOK, data)
}

// Error writes an error envelope: {"error": {"code","message"}}.
func Error(w http.ResponseWriter, status int, code, message string) {
	write(w, status, errorEnvelope{Error: errorBody{Code: code, Message: message}})
}

// Common helpers
func BadRequest(w http.ResponseWriter, msg string)   { Error(w, http.StatusBadRequest, CodeBadRequest, msg) }
func Unauthorized(w http.ResponseWriter, msg string) { Error(w, http.StatusUnauthorized, CodeUnauthorized, msg) }
func Forbidden(w http.ResponseWriter, msg string)    { Error(w, http.StatusForbidden, CodeForbidden, msg) }
func NotFound(w http.ResponseWriter, msg string)     { Error(w, http.StatusNotFound, CodeNotFound, msg) }
func Conflict(w http.ResponseWriter, msg string)     { Error(w, http.StatusConflict, CodeConflict, msg) }
func Validation(w http.ResponseWriter, msg string)   { Error(w, http.StatusUnprocessableEntity, CodeValidation, msg) }

// Internal logs the real error but returns a generic message to the client.
func Internal(w http.ResponseWriter, err error) {
	if err != nil {
		slog.Error("internal error", "err", err.Error())
	}
	Error(w, http.StatusInternalServerError, CodeInternal, "Ichki xatolik yuz berdi")
}

func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("failed to encode response", "err", err.Error())
	}
}
