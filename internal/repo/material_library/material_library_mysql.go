package material_library

import (
	"context"
	"fmt"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

const _defaultEntityCap = 64

// MaterialLibraryRepo -.
type MaterialLibraryRepo struct {
	*mysql.MySQL
}

// NewMaterialLibraryRepo -.
func NewMaterialLibraryRepo(db *mysql.MySQL) *MaterialLibraryRepo {
	return &MaterialLibraryRepo{db}
}

// CreateMaterialLibrary 创建素材库记录
func (r *MaterialLibraryRepo) CreateMaterialLibrary(ctx context.Context, material *entity.MaterialLibrary) error {
	now := time.Now().Unix()
	material.CreatedAt = now
	material.UpdatedAt = now

	sql, args, err := r.Builder.
		Insert("material_libraries").
		Columns("title, content, tags, user_id, company_id, created_at, updated_at").
		Values(material.Title, material.Content, material.Tags, material.UserID, material.CompanyID, material.CreatedAt, material.UpdatedAt).
		ToSql()
	if err != nil {
		return fmt.Errorf("MaterialLibraryRepo - CreateMaterialLibrary - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("MaterialLibraryRepo - CreateMaterialLibrary - r.DB.Exec: %w", err)
	}

	// 获取自增ID
	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("MaterialLibraryRepo - CreateMaterialLibrary - result.LastInsertId: %w", err)
	}

	material.ID = lastInsertID
	return nil
}

// UpdateMaterialLibrary 更新素材库记录
func (r *MaterialLibraryRepo) UpdateMaterialLibrary(ctx context.Context, material *entity.MaterialLibrary) error {
	material.UpdatedAt = time.Now().Unix()

	sql, args, err := r.Builder.
		Update("material_libraries").
		Set("title", material.Title).
		Set("content", material.Content).
		Set("tags", material.Tags).
		Set("updated_at", material.UpdatedAt).
		Where("id = ?", material.ID).
		ToSql()
	if err != nil {
		return fmt.Errorf("MaterialLibraryRepo - UpdateMaterialLibrary - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("MaterialLibraryRepo - UpdateMaterialLibrary - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("MaterialLibraryRepo - UpdateMaterialLibrary - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("MaterialLibraryRepo - UpdateMaterialLibrary - material not found")
	}

	return nil
}

// DeleteMaterialLibrary 删除素材库记录
func (r *MaterialLibraryRepo) DeleteMaterialLibrary(ctx context.Context, id int64) error {
	sql, args, err := r.Builder.
		Delete("material_libraries").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("MaterialLibraryRepo - DeleteMaterialLibrary - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("MaterialLibraryRepo - DeleteMaterialLibrary - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("MaterialLibraryRepo - DeleteMaterialLibrary - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("MaterialLibraryRepo - DeleteMaterialLibrary - material not found")
	}

	return nil
}

// GetMaterialLibraryByID 根据ID获取素材库记录
func (r *MaterialLibraryRepo) GetMaterialLibraryByID(ctx context.Context, id int64) (*entity.MaterialLibrary, error) {
	sql, args, err := r.Builder.
		Select("id, title, content, tags, user_id, company_id, created_at, updated_at").
		From("material_libraries").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("MaterialLibraryRepo - GetMaterialLibraryByID - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sql, args...)

	material := &entity.MaterialLibrary{}
	err = row.Scan(&material.ID, &material.Title, &material.Content, &material.Tags,
		&material.UserID, &material.CompanyID, &material.CreatedAt, &material.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("MaterialLibraryRepo - GetMaterialLibraryByID - row.Scan: %w", err)
	}

	return material, nil
}

// GetMaterialLibrariesWithPage 分页查询素材库列表，支持标签和标题查询
func (r *MaterialLibraryRepo) GetMaterialLibrariesWithPage(ctx context.Context, companyID int64, tags []string, title string, userID int64, page, pageSize int, ids []int64) ([]*entity.MaterialLibrary, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	// 获取总数
	total, err := r.CountMaterialLibraries(ctx, companyID, tags, title, userID, ids)
	if err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	materials, err := r.getMaterialLibrariesByPage(ctx, companyID, tags, title, userID, pageSize, offset, ids)
	if err != nil {
		return nil, 0, err
	}

	return materials, total, nil
}

// getMaterialLibrariesByPage 分页查询具体实现
func (r *MaterialLibraryRepo) getMaterialLibrariesByPage(ctx context.Context, companyID int64, tags []string, title string, userID int64, limit, offset int, ids []int64) ([]*entity.MaterialLibrary, error) {
	builder := r.Builder.
		Select("id, title, tags, content, user_id, company_id, created_at, updated_at").
		From("material_libraries").
		Where("company_id = ?", companyID).
		OrderBy("updated_at DESC").
		Limit(uint64(limit)).
		Offset(uint64(offset))

	// 用户ID过滤（获取用户自己的素材）
	if userID > 0 {
		builder = builder.Where("user_id = ?", userID)
	}

	// 标题模糊查询
	if title != "" {
		builder = builder.Where("title LIKE ?", "%"+title+"%")
	}

	// tags 查询 - 使用 JSON_CONTAINS 进行 JSON 数组查询
	if len(tags) > 0 {
		for _, tag := range tags {
			builder = builder.Where("JSON_CONTAINS(tags, ?)", fmt.Sprintf(`"%s"`, tag))
		}
	}

	// ID 列表过滤
	if len(ids) > 0 {
		builder = builder.Where(squirrel.Eq{"id": ids})
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return nil, fmt.Errorf("MaterialLibraryRepo - getMaterialLibrariesByPage - r.Builder: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("MaterialLibraryRepo - getMaterialLibrariesByPage - r.DB.Query: %w", err)
	}
	defer rows.Close()

	materials := make([]*entity.MaterialLibrary, 0, _defaultEntityCap)

	for rows.Next() {
		material := &entity.MaterialLibrary{}
		err = rows.Scan(&material.ID, &material.Title, &material.Tags, &material.Content,
			&material.UserID, &material.CompanyID, &material.CreatedAt, &material.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("MaterialLibraryRepo - getMaterialLibrariesByPage - rows.Scan: %w", err)
		}
		materials = append(materials, material)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("MaterialLibraryRepo - getMaterialLibrariesByPage - rows.Err: %w", err)
	}

	return materials, nil
}

// CountMaterialLibraries 统计数量
func (r *MaterialLibraryRepo) CountMaterialLibraries(ctx context.Context, companyID int64, tags []string, title string, userID int64, ids []int64) (int, error) {
	builder := r.Builder.
		Select("COUNT(*)").
		From("material_libraries").
		Where("company_id = ?", companyID)

	// 用户ID过滤
	if userID > 0 {
		builder = builder.Where("user_id = ?", userID)
	}

	// 标题模糊查询
	if title != "" {
		builder = builder.Where("title LIKE ?", "%"+title+"%")
	}

	// tags 查询
	if len(tags) > 0 {
		for _, tag := range tags {
			builder = builder.Where("JSON_CONTAINS(tags, ?)", fmt.Sprintf(`"%s"`, tag))
		}
	}

	if len(ids) > 0 {
		builder = builder.Where(squirrel.Eq{"id": ids})
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return 0, fmt.Errorf("MaterialLibraryRepo - CountMaterialLibraries - r.Builder: %w", err)
	}

	var count int
	err = r.DB.QueryRowContext(ctx, sql, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("MaterialLibraryRepo - CountMaterialLibraries - r.DB.QueryRow: %w", err)
	}

	return count, nil
}
