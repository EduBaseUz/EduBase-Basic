package services

import "fmt"

// Kind classifies a service error so handlers can map it to an HTTP status.
type Kind int

const (
	KindInternal Kind = iota
	KindBadRequest
	KindUnauthorized
	KindForbidden
	KindNotFound
	KindConflict
	KindValidation
)

// Error is a typed service error.
type Error struct {
	Kind    Kind
	Message string
}

func (e *Error) Error() string { return e.Message }

func newErr(kind Kind, format string, args ...any) *Error {
	return &Error{Kind: kind, Message: fmt.Sprintf(format, args...)}
}

func BadRequest(format string, args ...any) *Error   { return newErr(KindBadRequest, format, args...) }
func Unauthorized(format string, args ...any) *Error { return newErr(KindUnauthorized, format, args...) }
func Forbidden(format string, args ...any) *Error    { return newErr(KindForbidden, format, args...) }
func NotFound(format string, args ...any) *Error     { return newErr(KindNotFound, format, args...) }
func Conflict(format string, args ...any) *Error     { return newErr(KindConflict, format, args...) }
func Validation(format string, args ...any) *Error   { return newErr(KindValidation, format, args...) }
