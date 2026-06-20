package services

import (
	"context"
	"errors"
	"time"

	"edubase/backend/internal/models"
	"edubase/backend/internal/repositories"
	"edubase/backend/internal/repositories/mongo"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OrgFinanceService manages organizational income/expense (Qo'shimcha to'lovlar).
type OrgFinanceService struct {
	txns repositories.OrgTransactionRepository
}

func NewOrgFinanceService(txns repositories.OrgTransactionRepository) *OrgFinanceService {
	return &OrgFinanceService{txns: txns}
}

// OrgTransactionInput is the payload for creating/updating an org transaction.
type OrgTransactionInput struct {
	Kind     string `json:"kind" validate:"required,oneof=income expense"`
	Category string `json:"category"`
	Amount   int64  `json:"amount" validate:"required,min=1"`
	Comment  string `json:"comment"`
	Date     string `json:"date"`
}

func (s *OrgFinanceService) List(ctx context.Context, p repositories.Page) ([]models.OrgTransaction, int64, error) {
	return s.txns.List(ctx, p)
}

func (s *OrgFinanceService) Create(ctx context.Context, actorID primitive.ObjectID, in OrgTransactionInput) (*models.OrgTransaction, error) {
	date := time.Now()
	if in.Date != "" {
		if d, err := parseDate(in.Date); err == nil {
			date = d
		}
	}
	t := &models.OrgTransaction{
		Kind:     models.OrgTxnKind(in.Kind),
		Category: in.Category,
		Amount:   in.Amount,
		Comment:  in.Comment,
		Date:     date,
		By:       actorID,
	}
	if err := s.txns.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *OrgFinanceService) Update(ctx context.Context, id primitive.ObjectID, in OrgTransactionInput) (*models.OrgTransaction, error) {
	t, err := s.txns.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return nil, NotFound("Yozuv topilmadi")
		}
		return nil, err
	}
	t.Kind = models.OrgTxnKind(in.Kind)
	t.Category = in.Category
	t.Amount = in.Amount
	t.Comment = in.Comment
	if in.Date != "" {
		if d, err := parseDate(in.Date); err == nil {
			t.Date = d
		}
	}
	if err := s.txns.Update(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *OrgFinanceService) Delete(ctx context.Context, id primitive.ObjectID) error {
	if _, err := s.txns.GetByID(ctx, id); err != nil {
		if errors.Is(err, mongo.ErrNotFound) {
			return NotFound("Yozuv topilmadi")
		}
		return err
	}
	return s.txns.Delete(ctx, id)
}
