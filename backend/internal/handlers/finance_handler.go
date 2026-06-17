package handlers

import (
	"net/http"
	"time"

	"edubase/backend/internal/middleware"
	"edubase/backend/internal/services"
	"edubase/backend/pkg/response"
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

// ListTuition (admin) syncs and lists tuition ledgers for a period.
func (h *Handlers) ListTuition(w http.ResponseWriter, r *http.Request) {
	period := periodOrCurrent(r)
	if err := h.svc.Tuition.SyncAllForPeriod(r.Context(), period); err != nil {
		fail(w, err)
		return
	}
	p := pageFrom(r)
	ledgers, total, err := h.svc.Tuition.List(r.Context(), period, p)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, paginated(ledgers, total, p))
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

// ListPayouts (admin) syncs and lists mentor payouts for a period.
func (h *Handlers) ListPayouts(w http.ResponseWriter, r *http.Request) {
	period := periodOrCurrent(r)
	if err := h.svc.Payout.SyncAllForPeriod(r.Context(), period); err != nil {
		fail(w, err)
		return
	}
	p := pageFrom(r)
	payouts, total, err := h.svc.Payout.List(r.Context(), period, p)
	if err != nil {
		fail(w, err)
		return
	}
	response.OK(w, paginated(payouts, total, p))
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
