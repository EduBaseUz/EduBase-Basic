package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PayStatus is the settlement state for a ledger or payout.
type PayStatus string

const (
	PayPending PayStatus = "pending"
	PayPartial PayStatus = "partial"
	PayPaid    PayStatus = "paid"
)

// Transaction is a single recorded money movement.
type Transaction struct {
	Date    time.Time          `bson:"date" json:"date"`
	Amount  int64              `bson:"amount" json:"amount"`
	Comment string             `bson:"comment,omitempty" json:"comment,omitempty"`
	By      primitive.ObjectID `bson:"by" json:"by"`
}

// TuitionLedger tracks what a student owes for a group in a period and payments made.
type TuitionLedger struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	StudentID    primitive.ObjectID `bson:"studentId" json:"studentId"`
	GroupID      primitive.ObjectID `bson:"groupId" json:"groupId"`
	Period       string             `bson:"period" json:"period"` // "YYYY-MM"
	TotalDue     int64              `bson:"totalDue" json:"totalDue"`
	Discount     int64              `bson:"discount" json:"discount"`
	Transactions []Transaction      `bson:"transactions" json:"transactions"`
	Status       PayStatus          `bson:"status" json:"status"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// Payout tracks what a mentor earned in a period and payments made.
type Payout struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	MentorID     primitive.ObjectID `bson:"mentorId" json:"mentorId"`
	Period       string             `bson:"period" json:"period"` // "YYYY-MM"
	EarnedAmount int64              `bson:"earnedAmount" json:"earnedAmount"`
	Transactions []Transaction      `bson:"transactions" json:"transactions"`
	Status       PayStatus          `bson:"status" json:"status"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// SumTransactions totals a slice of transactions.
func SumTransactions(txns []Transaction) int64 {
	var total int64
	for _, t := range txns {
		total += t.Amount
	}
	return total
}

// ComputeStatus derives a PayStatus from amount paid vs amount owed.
func ComputeStatus(paid, owed int64) PayStatus {
	if owed <= 0 {
		if paid > 0 {
			return PayPaid
		}
		return PayPaid // nothing owed → considered settled
	}
	if paid <= 0 {
		return PayPending
	}
	if paid >= owed {
		return PayPaid
	}
	return PayPartial
}
