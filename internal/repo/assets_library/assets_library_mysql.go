package assets_library

import (
	"context"
	"fmt"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

const _defaultEntityCap = 64

// AssetsLibraryRepo -.
type AssetsLibraryRepo struct {
	*mysql.MySQL
}

// NewAssetsLibraryRepo -.
func NewAssetsLibraryRepo(db *mysql.MySQL) *AssetsLibraryRepo {
	return &AssetsLibraryRepo{db}
}

// CreateAssetsLibrary 创建资产库记录
func (r *AssetsLibraryRepo) CreateAssetsLibrary(ctx context.Context, asset *entity.AssetsLibrary) error {
	now := time.Now().Unix()
	asset.CreatedAt = now
	asset.UpdatedAt = now

	sql, args, err := r.Builder.
		Insert("assets_libraries").
		Columns("path, title, type, description, size, suffix, tags, user_id, company_id, is_public, created_at, updated_at").
		Values(asset.Path, asset.Title, asset.Type, asset.Description, asset.Size, asset.Suffix, asset.Tags, asset.UserID, asset.CompanyID, asset.IsPublic, asset.CreatedAt, asset.UpdatedAt).
		ToSql()
	if err != nil {
		return fmt.Errorf("AssetsLibraryRepo - CreateAssetsLibrary - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("AssetsLibraryRepo - CreateAssetsLibrary - r.DB.Exec: %w", err)
	}

	// 获取自增ID
	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("AssetsLibraryRepo - CreateAssetsLibrary - result.LastInsertId: %w", err)
	}

	asset.ID = lastInsertID
	return nil
}

// UpdateAssetsLibrary 更新资产库记录（只更新描述、tags、是否公用）
func (r *AssetsLibraryRepo) UpdateAssetsLibrary(ctx context.Context, asset *entity.AssetsLibrary) error {
	now := time.Now().Unix()
	asset.UpdatedAt = now

	sql, args, err := r.Builder.
		Update("assets_libraries").
		Set("title", asset.Title).
		Set("description", asset.Description).
		Set("tags", asset.Tags).
		Set("is_public", asset.IsPublic).
		Set("updated_at", asset.UpdatedAt).
		Where("id = ?", asset.ID).
		ToSql()
	if err != nil {
		return fmt.Errorf("AssetsLibraryRepo - UpdateAssetsLibrary - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("AssetsLibraryRepo - UpdateAssetsLibrary - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("AssetsLibraryRepo - UpdateAssetsLibrary - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("AssetsLibraryRepo - UpdateAssetsLibrary - asset not found")
	}

	return nil
}

// DeleteAssetsLibrary 删除资产库记录
func (r *AssetsLibraryRepo) DeleteAssetsLibrary(ctx context.Context, id int64) error {
	sql, args, err := r.Builder.
		Delete("assets_libraries").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("AssetsLibraryRepo - DeleteAssetsLibrary - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("AssetsLibraryRepo - DeleteAssetsLibrary - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("AssetsLibraryRepo - DeleteAssetsLibrary - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("AssetsLibraryRepo - DeleteAssetsLibrary - asset not found")
	}

	return nil
}

// GetAssetsLibraryByID 根据ID获取资产库记录
func (r *AssetsLibraryRepo) GetAssetsLibraryByID(ctx context.Context, id int64) (*entity.AssetsLibrary, error) {
	sql, args, err := r.Builder.
		Select("id, path, title, type, description, size, suffix, tags, user_id, company_id, is_public, created_at, updated_at").
		From("assets_libraries").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("AssetsLibraryRepo - GetAssetsLibraryByID - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sql, args...)

	asset := &entity.AssetsLibrary{}
	err = row.Scan(&asset.ID, &asset.Path, &asset.Title, &asset.Type, &asset.Description, &asset.Size, &asset.Suffix,
		&asset.Tags, &asset.UserID, &asset.CompanyID, &asset.IsPublic, &asset.CreatedAt, &asset.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("AssetsLibraryRepo - GetAssetsLibraryByID - row.Scan: %w", err)
	}

	return asset, nil
}

// GetAssetsLibrariesWithPage 分页查询资产库列表，支持标签、描述模糊查询和是否公用查询
func (r *AssetsLibraryRepo) GetAssetsLibrariesWithPage(ctx context.Context, companyID int64, tags []string, description string, isPublic *bool, userID int64, assetType string, ids []int64, page, pageSize int) ([]*entity.AssetsLibrary, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	// 获取总数
	total, err := r.CountAssetsLibraries(ctx, companyID, tags, description, isPublic, userID, assetType, ids)
	if err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	assets, err := r.getAssetsLibrariesByPage(ctx, companyID, tags, description, isPublic, userID, assetType, pageSize, offset, ids)
	if err != nil {
		return nil, 0, err
	}

	return assets, total, nil
}

// getAssetsLibrariesByPage 分页查询具体实现
func (r *AssetsLibraryRepo) getAssetsLibrariesByPage(ctx context.Context, companyID int64, tags []string, description string, isPublic *bool, userID int64, assetType string, limit, offset int, ids []int64) ([]*entity.AssetsLibrary, error) {
	builder := r.Builder.
		Select("id, path, title, type, description, size, suffix, tags, user_id, company_id, is_public, created_at, updated_at").
		From("assets_libraries").
		Where("company_id = ?", companyID).
		OrderBy("updated_at DESC").
		Limit(uint64(limit)).
		Offset(uint64(offset))

	// 用户ID过滤（获取用户自己的或公开的资产）
	if userID > 0 {
		builder = builder.Where("(user_id = ? OR is_public = true)", userID)
	}

	// 是否公用过滤
	if isPublic != nil {
		builder = builder.Where("is_public = ?", *isPublic)
	}

	// 描述模糊查询
	if description != "" {
		builder = builder.Where("description LIKE ? OR title LIKE ?", "%"+description+"%", "%"+description+"%")
	}
	if len(ids) > 0 {
		builder = builder.Where(squirrel.Eq{"id": ids})
	}
	// 资产类型过滤
	if assetType != "" {
		builder = builder.Where("type = ?", assetType)
	}

	// tags 查询 - 使用 JSON_CONTAINS 进行 JSON 数组查询
	if len(tags) > 0 {
		for _, tag := range tags {
			builder = builder.Where("JSON_CONTAINS(tags, ?)", fmt.Sprintf(`"%s"`, tag))
		}
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return nil, fmt.Errorf("AssetsLibraryRepo - getAssetsLibrariesByPage - r.Builder: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("AssetsLibraryRepo - getAssetsLibrariesByPage - r.DB.Query: %w", err)
	}
	defer rows.Close()

	assets := make([]*entity.AssetsLibrary, 0, _defaultEntityCap)

	for rows.Next() {
		asset := &entity.AssetsLibrary{}
		err = rows.Scan(&asset.ID, &asset.Path, &asset.Title, &asset.Type, &asset.Description, &asset.Size, &asset.Suffix,
			&asset.Tags, &asset.UserID, &asset.CompanyID, &asset.IsPublic, &asset.CreatedAt, &asset.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("AssetsLibraryRepo - getAssetsLibrariesByPage - rows.Scan: %w", err)
		}
		assets = append(assets, asset)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("AssetsLibraryRepo - getAssetsLibrariesByPage - rows.Err: %w", err)
	}

	return assets, nil
}

// CountAssetsLibraries 统计数量
func (r *AssetsLibraryRepo) CountAssetsLibraries(ctx context.Context, companyID int64, tags []string, description string, isPublic *bool, userID int64, assetType string, ids []int64) (int, error) {
	builder := r.Builder.
		Select("COUNT(*)").
		From("assets_libraries").
		Where("company_id = ?", companyID)

	// 用户ID过滤
	if userID > 0 {
		builder = builder.Where("(user_id = ? OR is_public = true)", userID)
	}

	// 是否公用过滤
	if isPublic != nil {
		builder = builder.Where("is_public = ?", *isPublic)
	}

	// 描述或者标题模糊查询
	if description != "" {
		builder = builder.Where("description LIKE ? OR title LIKE ?", "%"+description+"%", "%"+description+"%")
	}

	// ID 过滤
	if len(ids) > 0 {
		builder = builder.Where(squirrel.Eq{"id": ids})
	}
	// 资产类型过滤
	if assetType != "" {
		builder = builder.Where("type = ?", assetType)
	}

	// tags 查询
	if len(tags) > 0 {
		for _, tag := range tags {
			builder = builder.Where("JSON_CONTAINS(tags, ?)", fmt.Sprintf(`"%s"`, tag))
		}
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return 0, fmt.Errorf("AssetsLibraryRepo - CountAssetsLibraries - r.Builder: %w", err)
	}

	var count int
	err = r.DB.QueryRowContext(ctx, sql, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("AssetsLibraryRepo - CountAssetsLibraries - r.DB.QueryRow: %w", err)
	}

	return count, nil
}
