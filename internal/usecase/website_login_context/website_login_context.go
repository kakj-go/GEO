package website_login_context

import (
	"context"
	"fmt"
	"time"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
)

// UseCase -.
type UseCase struct {
	repo repo.WebsiteLoginContextRepo
}

// New -.
func New(r repo.WebsiteLoginContextRepo) *UseCase {
	return &UseCase{
		repo: r,
	}
}

// CreateWebsiteLoginContext - create new website login context.
func (uc *UseCase) CreateWebsiteLoginContext(ctx context.Context, context *entity.WebsiteLoginContext) error {
	// 设置公司ID和用户ID
	context.CompanyID = ctx.Value(constants.CompanyID).(int64)
	context.UserID = ctx.Value(constants.UserID).(int64)

	// 设置默认状态为有效
	if context.Status == 0 {
		context.Status = 1
	}

	// 设置默认每日限制
	if context.DailyLimit == 0 {
		if limit, ok := constants.PlatformLimits[context.Platform]; ok {
			context.DailyLimit = limit
		} else {
			context.DailyLimit = 10 // 默认限制
		}
	}
	context.TodayCount = 0
	context.LastResetAt = time.Now().Unix()

	err := uc.repo.CreateWebsiteLoginContext(ctx, context)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextUseCase - CreateWebsiteLoginContext - uc.repo.CreateWebsiteLoginContext: %w", err)
	}

	return nil
}

// UpdateWebsiteLoginContext - update website login context (only browser_context, tags, status allowed).
func (uc *UseCase) UpdateWebsiteLoginContext(ctx context.Context, context *entity.WebsiteLoginContext) error {
	// 先查询现有记录
	dbContext, err := uc.repo.GetWebsiteLoginContextByID(ctx, context.ID)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextUseCase - UpdateWebsiteLoginContext - uc.repo.GetWebsiteLoginContextByID: %w", err)
	}

	// 权限校验：只能修改自己公司的记录
	if dbContext.CompanyID != ctx.Value(constants.CompanyID).(int64) {
		return fmt.Errorf("WebsiteLoginContextUseCase - UpdateWebsiteLoginContext - permission denied")
	}

	dbContext.Tags = context.Tags
	if context.Username != "" {
		dbContext.Username = context.Username
	}
	if context.Avatar != "" {
		dbContext.Avatar = context.Avatar
	}
	dbContext.Fingerprint = context.Fingerprint
	dbContext.Proxy = context.Proxy
	// 只允许更新指定字段
	if context.BrowserContext != "" {
		dbContext.BrowserContext = context.BrowserContext
	}
	if context.Status == 0 || context.Status == 1 {
		dbContext.Status = context.Status
	}
	if context.DailyLimit > 0 {
		dbContext.DailyLimit = context.DailyLimit
	}

	err = uc.repo.UpdateWebsiteLoginContext(ctx, dbContext)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextUseCase - UpdateWebsiteLoginContext - uc.repo.UpdateWebsiteLoginContext: %w", err)
	}

	return nil
}

// DeleteWebsiteLoginContext - delete website login context.
func (uc *UseCase) DeleteWebsiteLoginContext(ctx context.Context, id int64) error {
	// 先查询现有记录
	dbContext, err := uc.repo.GetWebsiteLoginContextByID(ctx, id)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextUseCase - DeleteWebsiteLoginContext - uc.repo.GetWebsiteLoginContextByID: %w", err)
	}

	// 权限校验：只能删除自己公司的记录
	if dbContext.CompanyID != ctx.Value(constants.CompanyID).(int64) {
		return fmt.Errorf("WebsiteLoginContextUseCase - DeleteWebsiteLoginContext - permission denied")
	}

	err = uc.repo.DeleteWebsiteLoginContext(ctx, id)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextUseCase - DeleteWebsiteLoginContext - uc.repo.DeleteWebsiteLoginContext: %w", err)
	}

	return nil
}

// GetWebsiteLoginContextByID - get website login context by ID.
func (uc *UseCase) GetWebsiteLoginContextByID(ctx context.Context, id int64) (*entity.WebsiteLoginContext, error) {
	context, err := uc.repo.GetWebsiteLoginContextByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("WebsiteLoginContextUseCase - GetWebsiteLoginContextByID - uc.repo.GetWebsiteLoginContextByID: %w", err)
	}

	// 权限校验：只能查看自己公司的记录
	if context.CompanyID != ctx.Value(constants.CompanyID).(int64) {
		return nil, fmt.Errorf("WebsiteLoginContextUseCase - GetWebsiteLoginContextByID - permission denied")
	}

	return context, nil
}

// GetWebsiteLoginContextsWithPage - get website login contexts with pagination and filters.
func (uc *UseCase) GetWebsiteLoginContextsWithPage(ctx context.Context, platform, purpose string, username string, tags []string, page, pageSize int) (*entity.WebsiteLoginContextList, error) {
	companyID := ctx.Value(constants.CompanyID).(int64)

	contexts, total, err := uc.repo.GetWebsiteLoginContextsWithPage(ctx, companyID, platform, purpose, username, tags, nil, page, pageSize)
	if err != nil {
		return nil, fmt.Errorf("WebsiteLoginContextUseCase - GetWebsiteLoginContextsWithPage - uc.repo.GetWebsiteLoginContextsWithPage: %w", err)
	}

	// 检查是否需要重置今日发送次数
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()

	for _, c := range contexts {
		if c.LastResetAt < today {
			_ = uc.repo.ResetTodayCount(ctx, c.ID)
			c.TodayCount = 0
			c.LastResetAt = now.Unix()
		}
	}

	return &entity.WebsiteLoginContextList{
		Contexts: contexts,
		Total:    total,
		Page:     page,
		Size:     pageSize,
	}, nil
}
