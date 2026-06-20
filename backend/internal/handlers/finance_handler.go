package handlers

import (
	"net/http"
	"time"

	"edubase/backend/internal/middleware"
	"edubase/backend/internal/services"
	"edubase/backend/pkg/response"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// tashkent is the business timezone for period calculations.
var tashkent = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Tashkent")
	if err != nil {
		return time.FixedZone("UTC+5", 5*3600)
	}
	return loc
}()

func currentPeriod() string {
	return time.Now().In(tashkent).Format("2006-01")
}

func periodOrCurrent(r *http.Request) string {
	if p := r.URL.Query().Get("period"); p != "" {
		return p
	}
	return currentPeriod()
}

// FinanceSummary (admin) returns income vs expense vs profit, optionally filtered.
func (h *Handlers) FinanceSummary(w http.ResponseWriter, r *http.Request) {
	var from, to *time.Time
	q := r.URL.Query()
	if v := q.Get("from"); v != "" {
		if t, err := time.ParseInLocation("2006-01-02", v, tashkent); err == nil {
			from = &t
		}
	}
	if v := q.Get("to"); v != "" {
		if t, err := time.ParseInLocation("2006-01-02", v, tashkent); err == nil {
			// make 'to' exclusive end of that day
			end := t.AddDate(0, 0, 1)
			to = &end
		}
	}
	sum, err := h.svc.Dashboard.Summary(r.Context(), from, to)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, sum)
}

// ListTuition (admin) lists student ledgers for a course + period (Oylik narx).
// Query: ?courseId=...&period=YYYY-MM-DD
func (h *Handlers) ListTuition(w http.ResponseWriter, r *http.Request) {
	courseID, err := primitive.ObjectIDFromHex(r.URL.Query().Get("courseId"))
	if err != nil {
		response.BadRequest(w, "Mutaxassislikni tanlang")
		return
	}
	period := r.URL.Query().Get("period")
	if period == "" {
		response.BadRequest(w, "Davrni tanlang")
		return
	}
	rows, err := h.svc.Tuition.ListByCoursePeriod(r.Context(), courseID, period)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, rows)
}

// StudentTuitionHistory (admin) returns all of one student's tuition ledgers.
func (h *Handlers) StudentTuitionHistory(w http.ResponseWriter, r *http.Request) {
	sid, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	rows, err := h.svc.Tuition.ListByStudent(r.Context(), sid)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, rows)
}

// DeleteTuitionTransaction (admin) removes a payment from a ledger.
func (h *Handlers) DeleteTuitionTransaction(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	txnID, err := idParam(r, "txnId")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz to'lov identifikatori")
		return
	}
	l, err := h.svc.Tuition.DeleteTransaction(r.Context(), id, txnID)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, l)
}

// Debtors (admin) returns outstanding balances (Haqdorlar) by role.
func (h *Handlers) Debtors(w http.ResponseWriter, r *http.Request) {
	students, err := h.svc.Tuition.StudentBalances(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	mentors, err := h.svc.Payout.MentorBalances(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]any{"students": students, "mentors": mentors})
}

// AddTuitionTransaction (admin) records a tuition payment.
func (h *Handlers) AddTuitionTransaction(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var in services.TransactionInput
	if !h.decode(w, r, &in) {
		return
	}
	actor := middleware.UserID(r.Context())
	l, err := h.svc.Tuition.AddTransaction(r.Context(), id, actor, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, l)
}

// UpdateTuition (admin) sets a ledger's discount.
func (h *Handlers) UpdateTuition(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var in services.UpdateLedgerInput
	if !h.decode(w, r, &in) {
		return
	}
	l, err := h.svc.Tuition.Update(r.Context(), id, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, l)
}

// ListPayouts (admin) lists mentor payouts for a course + period (Oylik narx).
// Query: ?courseId=...&period=YYYY-MM-DD
func (h *Handlers) ListPayouts(w http.ResponseWriter, r *http.Request) {
	courseID, err := primitive.ObjectIDFromHex(r.URL.Query().Get("courseId"))
	if err != nil {
		response.BadRequest(w, "Mutaxassislikni tanlang")
		return
	}
	period := r.URL.Query().Get("period")
	if period == "" {
		response.BadRequest(w, "Davrni tanlang")
		return
	}
	rows, err := h.svc.Payout.ListByCoursePeriod(r.Context(), courseID, period)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, rows)
}

// DeletePayoutTransaction (admin) removes a payment from a payout.
func (h *Handlers) DeletePayoutTransaction(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	txnID, err := idParam(r, "txnId")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz to'lov identifikatori")
		return
	}
	p, err := h.svc.Payout.DeleteTransaction(r.Context(), id, txnID)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, p)
}

// AddPayoutTransaction (admin) records a mentor payment.
func (h *Handlers) AddPayoutTransaction(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var in services.TransactionInput
	if !h.decode(w, r, &in) {
		return
	}
	actor := middleware.UserID(r.Context())
	p, err := h.svc.Payout.AddTransaction(r.Context(), id, actor, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, p)
}

// --- Qo'shimcha to'lovlar (organizational income/expense) ---

// ListOrgTransactions (admin) returns organizational income/expense records.
func (h *Handlers) ListOrgTransactions(w http.ResponseWriter, r *http.Request) {
	p := pageFrom(r)
	items, total, err := h.svc.OrgFinance.List(r.Context(), p)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, paginated(items, total, p))
}

// CreateOrgTransaction (admin) records a new income/expense.
func (h *Handlers) CreateOrgTransaction(w http.ResponseWriter, r *http.Request) {
	var in services.OrgTransactionInput
	if !h.decode(w, r, &in) {
		return
	}
	actor := middleware.UserID(r.Context())
	t, err := h.svc.OrgFinance.Create(r.Context(), actor, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.Created(w, t)
}

// UpdateOrgTransaction (admin) edits an income/expense record.
func (h *Handlers) UpdateOrgTransaction(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	var in services.OrgTransactionInput
	if !h.decode(w, r, &in) {
		return
	}
	t, err := h.svc.OrgFinance.Update(r.Context(), id, in)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, t)
}

// DeleteOrgTransaction (admin) removes an income/expense record.
func (h *Handlers) DeleteOrgTransaction(w http.ResponseWriter, r *http.Request) {
	id, err := idParam(r, "id")
	if err != nil {
		response.BadRequest(w, "Yaroqsiz identifikator")
		return
	}
	if err := h.svc.OrgFinance.Delete(r.Context(), id); err != nil {
		fail(w, err)
		return
	}
	response.OK(w, map[string]bool{"deleted": true})
}
