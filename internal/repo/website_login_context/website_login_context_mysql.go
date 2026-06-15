package website_login_context

import (
	"context"
	"fmt"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

const _defaultEntityCap = 64

// WebsiteLoginContextRepo -.
type WebsiteLoginContextRepo struct {
	*mysql.MySQL
}

// NewWebsiteLoginContextRepo -.
func NewWebsiteLoginContextRepo(db *mysql.MySQL) *WebsiteLoginContextRepo {
	return &WebsiteLoginContextRepo{db}
}

// CreateWebsiteLoginContext -.
func (r *WebsiteLoginContextRepo) CreateWebsiteLoginContext(ctx context.Context, context *entity.WebsiteLoginContext) error {
	now := time.Now().Unix()
	context.CreatedAt = now
	context.UpdatedAt = now

	sql, args, err := r.Builder.
		Insert("website_login_contexts").
		Columns("company_id, user_id, platform, username, avatar, fingerprint, proxy, browser_context, tags, status, daily_limit, today_count, last_reset_at, created_at, updated_at").
		Values(context.CompanyID, context.UserID, context.Platform, context.Username, context.Avatar, context.Fingerprint, context.Proxy, context.BrowserContext, context.Tags, context.Status, context.DailyLimit, context.TodayCount, context.LastResetAt, context.CreatedAt, context.UpdatedAt).
		ToSql()
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - CreateWebsiteLoginContext - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - CreateWebsiteLoginContext - r.DB.Exec: %w", err)
	}

	// 获取自增ID
	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - CreateWebsiteLoginContext - result.LastInsertId: %w", err)
	}

	context.ID = lastInsertID
	return nil
}

// UpdateWebsiteLoginContext - 只允许修改 browser_context, username, tags, status
func (r *WebsiteLoginContextRepo) UpdateWebsiteLoginContext(ctx context.Context, context *entity.WebsiteLoginContext) error {
	now := time.Now().Unix()
	context.UpdatedAt = now

	sql, args, err := r.Builder.
		Update("website_login_contexts").
		Set("browser_context", context.BrowserContext).
		Set("username", context.Username).
		Set("avatar", context.Avatar).
		Set("tags", context.Tags).
		Set("status", context.Status).
		Set("proxy", context.Proxy).
		Set("fingerprint", context.Fingerprint).
		Set("daily_limit", context.DailyLimit).
		Set("updated_at", context.UpdatedAt).
		Where("id = ?", context.ID).
		ToSql()
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - UpdateWebsiteLoginContext - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - UpdateWebsiteLoginContext - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - UpdateWebsiteLoginContext - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("WebsiteLoginContextRepo - UpdateWebsiteLoginContext - context not found")
	}

	return nil
}

// DeleteWebsiteLoginContext - 硬删除
func (r *WebsiteLoginContextRepo) DeleteWebsiteLoginContext(ctx context.Context, id int64) error {
	sql, args, err := r.Builder.
		Delete("website_login_contexts").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - DeleteWebsiteLoginContext - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - DeleteWebsiteLoginContext - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - DeleteWebsiteLoginContext - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("WebsiteLoginContextRepo - DeleteWebsiteLoginContext - context not found")
	}

	return nil
}

// GetWebsiteLoginContextByID -.
func (r *WebsiteLoginContextRepo) GetWebsiteLoginContextByID(ctx context.Context, id int64) (*entity.WebsiteLoginContext, error) {
	sql, args, err := r.Builder.
		Select("id, company_id, user_id, platform, username, avatar, fingerprint, proxy, browser_context, tags, status, daily_limit, today_count, last_reset_at, created_at, updated_at").
		From("website_login_contexts").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("WebsiteLoginContextRepo - GetWebsiteLoginContextByID - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sql, args...)

	context := &entity.WebsiteLoginContext{}
	err = row.Scan(&context.ID, &context.CompanyID, &context.UserID, &context.Platform, &context.Username, &context.Avatar, &context.Fingerprint, &context.Proxy,
		&context.BrowserContext, &context.Tags, &context.Status, &context.DailyLimit, &context.TodayCount, &context.LastResetAt, &context.CreatedAt, &context.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("WebsiteLoginContextRepo - GetWebsiteLoginContextByID - row.Scan: %w", err)
	}

	return context, nil
}

// GetWebsiteLoginContextsWithPage - 分页查询，支持 tags, purpose, platform 查询
func (r *WebsiteLoginContextRepo) GetWebsiteLoginContextsWithPage(ctx context.Context, companyID int64, platform, purpose string, username string, tags []string, ids []int64, page, pageSize int) ([]*entity.WebsiteLoginContext, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	// 获取总数
	total, err := r.CountWebsiteLoginContexts(ctx, companyID, platform, purpose, username, tags, ids)
	if err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	contexts, err := r.getWebsiteLoginContextsByPage(ctx, companyID, platform, purpose, username, tags, ids, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	return contexts, total, nil
}

// getWebsiteLoginContextsByPage - 分页查询具体实现
func (r *WebsiteLoginContextRepo) getWebsiteLoginContextsByPage(ctx context.Context, companyID int64, platform, purpose string, username string, tags []string, ids []int64, limit, offset int) ([]*entity.WebsiteLoginContext, error) {
	builder := r.Builder.
		Select("id, company_id, user_id, platform, username, avatar, fingerprint, proxy, browser_context, tags, status, daily_limit, today_count, last_reset_at, created_at, updated_at").
		From("website_login_contexts").
		Where("company_id = ?", companyID).
		OrderBy("updated_at DESC").
		Limit(uint64(limit)).
		Offset(uint64(offset))

	if platform != "" {
		builder = builder.Where("platform = ?", platform)
	}

	if purpose != "" {
		platforms := constants.GetPlatformByPurpose(purpose)
		if len(platforms) > 0 {
			builder = builder.Where(squirrel.Eq{"platform": platforms})
		}
	}

	// username 查询
	if username != "" {
		builder = builder.Where("username like ?", fmt.Sprintf("%%%s%%", username))
	}

	// ids 查询
	if len(ids) > 0 {
		builder = builder.Where(squirrel.Eq{"id": ids})
	}

	// tags 查询 - 使用 JSON_CONTAINS 进行 JSON 数组查询
	if len(tags) > 0 {
		for _, tag := range tags {
			builder = builder.Where("JSON_CONTAINS(tags, ?)", fmt.Sprintf(`"%s"`, tag))
		}
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return nil, fmt.Errorf("WebsiteLoginContextRepo - getWebsiteLoginContextsByPage - r.Builder: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("WebsiteLoginContextRepo - getWebsiteLoginContextsByPage - r.DB.Query: %w", err)
	}
	defer rows.Close()

	contexts := make([]*entity.WebsiteLoginContext, 0, _defaultEntityCap)

	for rows.Next() {
		context := &entity.WebsiteLoginContext{}
		err = rows.Scan(&context.ID, &context.CompanyID, &context.UserID, &context.Platform, &context.Username, &context.Avatar, &context.Fingerprint, &context.Proxy,
			&context.BrowserContext, &context.Tags, &context.Status, &context.DailyLimit, &context.TodayCount, &context.LastResetAt, &context.CreatedAt, &context.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("WebsiteLoginContextRepo - getWebsiteLoginContextsByPage - rows.Scan: %w", err)
		}
		contexts = append(contexts, context)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("WebsiteLoginContextRepo - getWebsiteLoginContextsByPage - rows.Err: %w", err)
	}

	return contexts, nil
}

// CountWebsiteLoginContexts - 统计数量
func (r *WebsiteLoginContextRepo) CountWebsiteLoginContexts(ctx context.Context, companyID int64, platform, purpose string, username string, tags []string, ids []int64) (int, error) {
	builder := r.Builder.
		Select("COUNT(*)").
		From("website_login_contexts").
		Where("company_id = ?", companyID)

	if platform != "" {
		builder = builder.Where("platform = ?", platform)
	}

	if purpose != "" {
		platforms := constants.GetPlatformByPurpose(purpose)
		if len(platforms) > 0 {
			builder = builder.Where(squirrel.Eq{"platform": platforms})
		}
	}
	// username 查询
	if username != "" {
		builder = builder.Where("username like ?", fmt.Sprintf("%%%s%%", username))
	}

	if len(ids) > 0 {
		builder = builder.Where(squirrel.Eq{"id": ids})
	}

	// tags 查询
	if len(tags) > 0 {
		for _, tag := range tags {
			builder = builder.Where("JSON_CONTAINS(tags, ?)", fmt.Sprintf(`"%s"`, tag))
		}
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return 0, fmt.Errorf("WebsiteLoginContextRepo - CountWebsiteLoginContexts - r.Builder: %w", err)
	}

	var count int
	err = r.DB.QueryRowContext(ctx, sql, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("WebsiteLoginContextRepo - CountWebsiteLoginContexts - r.DB.QueryRow: %w", err)
	}

	return count, nil
}

func (r *WebsiteLoginContextRepo) IncrementTodayCount(ctx context.Context, id int64) error {
	sql, args, err := r.Builder.
		Update("website_login_contexts").
		Set("today_count", squirrel.Expr("today_count + 1")).
		Set("updated_at", time.Now().Unix()).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - IncrementTodayCount - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - IncrementTodayCount - r.DB.Exec: %w", err)
	}

	return nil
}

func (r *WebsiteLoginContextRepo) ResetTodayCount(ctx context.Context, id int64) error {
	sql, args, err := r.Builder.
		Update("website_login_contexts").
		Set("today_count", 0).
		Set("last_reset_at", time.Now().Unix()).
		Set("updated_at", time.Now().Unix()).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - ResetTodayCount - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("WebsiteLoginContextRepo - ResetTodayCount - r.DB.Exec: %w", err)
	}

	return nil
}
