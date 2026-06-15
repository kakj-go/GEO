package billing

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

type BillingRepo struct {
	*mysql.MySQL // Use existing database wrapper
}

func New(mg *mysql.MySQL) *BillingRepo {
	return &BillingRepo{mg}
}

func (r *BillingRepo) CreateTransaction(ctx context.Context, tx *entity.TransactionHistory) error {
	query := `INSERT INTO transaction_histories (
		company_id, user_id, type, amount, balance_before, balance_after, order_id, payment_method, remark, created_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	res, err := r.DB.ExecContext(ctx, query,
		tx.CompanyID, tx.UserID, tx.Type, tx.Amount, tx.BalanceBefore, tx.BalanceAfter,
		sql.NullString{String: tx.OrderID, Valid: tx.OrderID != ""},
		sql.NullString{String: tx.PaymentMethod, Valid: tx.PaymentMethod != ""},
		tx.Remark, tx.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("BillingRepo - CreateTransaction - r.DB.ExecContext: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return fmt.Errorf("BillingRepo - CreateTransaction - res.LastInsertId: %w", err)
	}

	tx.ID = id
	return nil
}

func (r *BillingRepo) CreateUsageLog(ctx context.Context, log *entity.UsageLog) error {
	query := `INSERT INTO usage_logs (
		company_id, user_id, session_id, model_id, prompt_tokens, completion_tokens, total_tokens, prompt_points, completion_points, points, duration_ms, throughput, finish_reason, content_preview, created_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	res, err := r.DB.ExecContext(ctx, query,
		log.CompanyID, log.UserID, log.SessionID, log.ModelID, log.PromptTokens, log.CompletionTokens, log.TotalTokens, log.PromptPoints, log.CompletionPoints, log.Points, log.DurationMs, log.Throughput, log.FinishReason, log.ContentPreview, log.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("BillingRepo - CreateUsageLog - r.DB.ExecContext: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return fmt.Errorf("BillingRepo - CreateUsageLog - res.LastInsertId: %w", err)
	}

	log.ID = id
	return nil
}

func (r *BillingRepo) GetTransactionsWithPage(ctx context.Context, companyID int64, page, pageSize int) ([]*entity.TransactionHistory, int, error) {
	offset := (page - 1) * pageSize
	query := `SELECT id, company_id, user_id, type, amount, balance_before, balance_after, order_id, payment_method, remark, created_at 
	          FROM transaction_histories WHERE company_id = ? AND type = 'recharge' ORDER BY created_at DESC LIMIT ? OFFSET ?`

	rows, err := r.DB.QueryContext(ctx, query, companyID, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("BillingRepo - GetTransactionsWithPage - r.DB.QueryContext: %w", err)
	}
	defer rows.Close()

	var txs []*entity.TransactionHistory
	for rows.Next() {
		tx := &entity.TransactionHistory{}
		var orderID, paymentMethod sql.NullString
		err := rows.Scan(
			&tx.ID, &tx.CompanyID, &tx.UserID, &tx.Type, &tx.Amount, &tx.BalanceBefore, &tx.BalanceAfter, &orderID, &paymentMethod, &tx.Remark, &tx.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("BillingRepo - GetTransactionsWithPage - rows.Scan: %w", err)
		}
		tx.OrderID = orderID.String
		tx.PaymentMethod = paymentMethod.String
		txs = append(txs, tx)
	}

	var total int
	err = r.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM transaction_histories WHERE company_id = ? AND type = 'recharge'", companyID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("BillingRepo - GetTransactionsWithPage - count: %w", err)
	}

	return txs, total, nil
}

func (r *BillingRepo) GetUsageLogsWithPage(ctx context.Context, companyID int64, modelID string, page, pageSize int) ([]*entity.UsageLog, int, error) {
	offset := (page - 1) * pageSize
	query := `SELECT id, company_id, user_id, session_id, model_id, prompt_tokens, completion_tokens, total_tokens, prompt_points, completion_points, points, duration_ms, throughput, finish_reason, content_preview, created_at 
	          FROM usage_logs WHERE company_id = ?`
	args := []interface{}{companyID}

	if modelID != "" {
		query += " AND model_id = ?"
		args = append(args, modelID)
	}

	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
	args = append(args, pageSize, offset)

	rows, err := r.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("BillingRepo - GetUsageLogsWithPage - r.DB.QueryContext: %w", err)
	}
	defer rows.Close()

	var logs []*entity.UsageLog
	for rows.Next() {
		log := &entity.UsageLog{}
		var sessionID sql.NullInt64
		err := rows.Scan(
			&log.ID, &log.CompanyID, &log.UserID, &sessionID, &log.ModelID, &log.PromptTokens, &log.CompletionTokens, &log.TotalTokens, &log.PromptPoints, &log.CompletionPoints, &log.Points, &log.DurationMs, &log.Throughput, &log.FinishReason, &log.ContentPreview, &log.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("BillingRepo - GetUsageLogsWithPage - rows.Scan: %w", err)
		}
		if sessionID.Valid {
			log.SessionID = sessionID.Int64
		}
		logs = append(logs, log)
	}

	countQuery := "SELECT COUNT(*) FROM usage_logs WHERE company_id = ?"
	countArgs := []interface{}{companyID}
	if modelID != "" {
		countQuery += " AND model_id = ?"
		countArgs = append(countArgs, modelID)
	}

	var total int
	err = r.DB.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("BillingRepo - GetUsageLogsWithPage - count: %w", err)
	}

	return logs, total, nil
}
