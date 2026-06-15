package billing

import (
	"context"
	"fmt"
	"time"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
)

type BillingUseCase struct {
	billingRepo repo.BillingRepo
	companyRepo repo.CompanyRepo
	modelRepo   repo.ModelRepo
	l           logger.Interface
}

func New(br repo.BillingRepo, cr repo.CompanyRepo, mr repo.ModelRepo, l logger.Interface) *BillingUseCase {
	return &BillingUseCase{
		billingRepo: br,
		companyRepo: cr,
		modelRepo:   mr,
		l:           l,
	}
}

func (uc *BillingUseCase) CalculateCost(ctx context.Context, modelID string, promptTokens, completionTokens int) (*entity.CostDetails, error) {
	pricing, err := uc.modelRepo.GetModelPricing(ctx)
	if err != nil {
		return nil, err
	}

	price, ok := pricing[modelID]
	if !ok {
		return nil, fmt.Errorf("model pricing not found for %s", modelID)
	}

	promptPoints := int64(promptTokens) * price.InputPrice / 1000000
	completionPoints := int64(completionTokens) * price.OutputPrice / 1000000
	totalPoints := promptPoints + completionPoints

	if totalPoints == 0 && (promptTokens > 0 || completionTokens > 0) {
		totalPoints = 1
	}

	return &entity.CostDetails{
		TotalPoints:      totalPoints,
		PromptPoints:     promptPoints,
		CompletionPoints: completionPoints,
	}, nil
}

func (uc *BillingUseCase) CheckBalance(ctx context.Context, companyID int64, modelID string) error {
	company, err := uc.companyRepo.GetCompanyByID(ctx, companyID)
	if err != nil {
		return err
	}
	if company.Balance < 1 {
		return fmt.Errorf("积分不足")
	}
	return nil
}

func (uc *BillingUseCase) DeductPoints(ctx context.Context, companyID, userID, sessionID int64, modelID string, promptTokens, completionTokens int, durationMs int64, finishReason, contentPreview string) (int64, error) {
	// 1. Calculate cost
	cost, err := uc.CalculateCost(ctx, modelID, promptTokens, completionTokens)
	if err != nil {
		uc.l.Error("BillingUseCase - DeductPoints - CalculateCostDetails: %v", err)
		return 0, err
	}

	// 2. Normalize finish reason: only 'stop' or empty is considered success.
	// Other reasons like 'length', 'content_filter', or error messages are considered unsuccessful for billing.
	isError := false
	if finishReason == "stop" || finishReason == "" {
		finishReason = ""
	} else {
		isError = true
	}

	points := cost.TotalPoints
	promptPoints := cost.PromptPoints
	completionPoints := cost.CompletionPoints

	// If it's an error, don't bill (set points to 0)
	if isError {
		points = 0
		promptPoints = 0
		completionPoints = 0
	}

	// 3. Record usage log (Record it even if deduction fails or points are 0)
	throughput := 0.0
	if durationMs > 0 {
		throughput = float64(promptTokens+completionTokens) / (float64(durationMs) / 1000.0)
	}

	usageLog := &entity.UsageLog{
		CompanyID:        companyID,
		UserID:           userID,
		SessionID:        sessionID,
		ModelID:          modelID,
		PromptTokens:     promptTokens,
		CompletionTokens: completionTokens,
		TotalTokens:      promptTokens + completionTokens,
		PromptPoints:     promptPoints,
		CompletionPoints: completionPoints,
		Points:           points,
		DurationMs:       durationMs,
		Throughput:       throughput,
		FinishReason:     finishReason,
		ContentPreview:   contentPreview,
		CreatedAt:        time.Now().Unix(),
	}
	err = uc.billingRepo.CreateUsageLog(ctx, usageLog)
	if err != nil {
		uc.l.Error("BillingUseCase - DeductPoints - CreateUsageLog: %v", err)
	}

	// 4. Only proceed with deduction if points > 0
	if points <= 0 {
		return 0, nil
	}

	company, err := uc.companyRepo.GetCompanyByID(ctx, companyID)
	if err != nil {
		uc.l.Error("BillingUseCase - DeductPoints - GetCompanyByID: %v", err)
		return 0, err
	}

	balanceBefore := company.Balance
	if balanceBefore < points {
		err = fmt.Errorf("积分不足: balance=%d, cost=%d", balanceBefore, points)
		uc.l.Error("BillingUseCase - DeductPoints: %v", err)
		return 0, err
	}

	err = uc.companyRepo.DeleteCompanyBalance(ctx, companyID, points)
	if err != nil {
		uc.l.Error("BillingUseCase - DeductPoints - DeleteCompanyBalance: %v", err)
		return 0, err
	}

	// balanceAfter := balanceBefore - points

	// 5. Record transaction (Skip recording for consumption as per requirement)
	/*
		transaction := &entity.TransactionHistory{
			CompanyID:     companyID,
			UserID:        userID,
			Type:          "consumption",
			Amount:        points,
			BalanceBefore: balanceBefore,
			BalanceAfter:  balanceAfter,
			Remark:        fmt.Sprintf("模型消费: %s, 令牌: %d", modelID, promptTokens+completionTokens),
			CreatedAt:     time.Now().Unix(),
		}
		err = uc.billingRepo.CreateTransaction(ctx, transaction)
		if err != nil {
			uc.l.Error("BillingUseCase - DeductPoints - CreateTransaction: %v", err)
		}
	*/

	return points, nil
}

func (uc *BillingUseCase) GetTransactions(ctx context.Context, companyID int64, page, pageSize int) (*entity.TransactionHistoryList, error) {
	txs, total, err := uc.billingRepo.GetTransactionsWithPage(ctx, companyID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &entity.TransactionHistoryList{Transactions: txs, Total: total}, nil
}

func (uc *BillingUseCase) GetUsageLogs(ctx context.Context, companyID int64, modelID string, page, pageSize int) (*entity.UsageLogList, error) {
	logs, total, err := uc.billingRepo.GetUsageLogsWithPage(ctx, companyID, modelID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &entity.UsageLogList{Logs: logs, Total: total}, nil
}

func (uc *BillingUseCase) DirectRecharge(ctx context.Context, companyID, userID int64, amount int64, paymentMethod, remark string) error {
	company, err := uc.companyRepo.GetCompanyByID(ctx, companyID)
	if err != nil {
		return err
	}

	balanceBefore := company.Balance

	err = uc.companyRepo.AddCompanyBalance(ctx, companyID, amount)
	if err != nil {
		return err
	}

	balanceAfter := balanceBefore + amount

	transaction := &entity.TransactionHistory{
		CompanyID:     companyID,
		UserID:        userID,
		Type:          "recharge",
		Amount:        amount,
		BalanceBefore: balanceBefore,
		BalanceAfter:  balanceAfter,
		PaymentMethod: paymentMethod,
		Remark:        remark,
		CreatedAt:     time.Now().Unix(),
	}
	return uc.billingRepo.CreateTransaction(ctx, transaction)
}
