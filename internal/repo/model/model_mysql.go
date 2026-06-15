package model

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
	"gopkg.in/yaml.v3"
)

// ModelRepo -.
type ModelRepo struct {
	*mysql.MySQL
}

// NewModelRepo -.
func NewModelRepo(db *mysql.MySQL) *ModelRepo {
	return &ModelRepo{db}
}

// CreateModel -.
func (r *ModelRepo) CreateModel(ctx context.Context, model *entity.Model) error {
	// 设置创建和更新时间
	now := time.Now().Unix()
	model.CreatedAt = now
	model.UpdatedAt = now

	sql, args, err := r.Builder.
		Insert("models").
		Columns(
			"provider_name", "model_name", "base_model", "model_type",
			"credential", "region", "endpoint_id", "api_endpoint_host",
			"status", "connectivity_status", "context_length", "is_default",
			"user_id", "company_id", "created_at", "updated_at",
		).
		Values(
			model.ProviderName, model.ModelName, model.BaseModel, model.ModelType,
			model.Credential, model.Region, model.EndpointID, model.ApiEndpointHost,
			model.Status, model.ConnectivityStatus, model.ContextLength, model.IsDefault,
			model.UserID, model.CompanyID, model.CreatedAt, model.UpdatedAt,
		).
		ToSql()

	if err != nil {
		return fmt.Errorf("ModelRepo - CreateModel - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("ModelRepo - CreateModel - r.DB.ExecContext: %w", err)
	}

	return nil
}

// UpdateModel -.
func (r *ModelRepo) UpdateModel(ctx context.Context, model *entity.Model) error {
	model.UpdatedAt = time.Now().Unix()

	sql, args, err := r.Builder.
		Update("models").
		Set("model_name", model.ModelName).
		Set("base_model", model.BaseModel).
		Set("credential", model.Credential).
		Set("region", model.Region).
		Set("endpoint_id", model.EndpointID).
		Set("api_endpoint_host", model.ApiEndpointHost).
		Set("status", model.Status).
		Set("connectivity_status", model.ConnectivityStatus).
		Set("context_length", model.ContextLength).
		Set("is_default", model.IsDefault).
		Set("updated_at", model.UpdatedAt).
		Where("id = ? AND company_id = ?", model.ID, model.CompanyID).
		ToSql()

	if err != nil {
		return fmt.Errorf("ModelRepo - UpdateModel - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("ModelRepo - UpdateModel - r.DB.ExecContext: %w", err)
	}

	return nil
}

// DeleteModel -.
func (r *ModelRepo) DeleteModel(ctx context.Context, id int64) error {
	sql, args, err := r.Builder.
		Delete("models").
		Where("id = ?", id).
		ToSql()

	if err != nil {
		return fmt.Errorf("ModelRepo - DeleteModel - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("ModelRepo - DeleteModel - r.DB.ExecContext: %w", err)
	}

	return nil
}

// GetModelByID -.
func (r *ModelRepo) GetModelByID(ctx context.Context, id int64) (*entity.Model, error) {
	sql, args, err := r.Builder.
		Select(
			"id", "provider_name", "model_name", "base_model", "model_type",
			"credential", "region", "endpoint_id", "api_endpoint_host",
			"status", "connectivity_status", "context_length", "is_default",
			"user_id", "company_id", "created_at", "updated_at",
		).
		From("models").
		Where("id = ?", id).
		ToSql()

	if err != nil {
		return nil, fmt.Errorf("ModelRepo - GetModelByID - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sql, args...)

	model := &entity.Model{}
	err = row.Scan(
		&model.ID, &model.ProviderName, &model.ModelName, &model.BaseModel, &model.ModelType,
		&model.Credential, &model.Region, &model.EndpointID, &model.ApiEndpointHost,
		&model.Status, &model.ConnectivityStatus, &model.ContextLength, &model.IsDefault,
		&model.UserID, &model.CompanyID, &model.CreatedAt, &model.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("ModelRepo - GetModelByID - row.Scan: %w", err)
	}

	return model, nil
}

// GetModelsWithPage -.
func (r *ModelRepo) GetModelsWithPage(ctx context.Context, companyID int64, modelType, status string, page, pageSize int) ([]*entity.Model, int, error) {
	// 构建查询条件
	query := r.Builder.
		Select(
			"id", "provider_name", "model_name", "base_model", "model_type",
			"credential", "region", "endpoint_id", "api_endpoint_host",
			"status", "connectivity_status", "context_length", "is_default",
			"user_id", "company_id", "created_at", "updated_at",
		).
		From("models").
		Where("company_id = ?", companyID)

	// 添加模型类型过滤
	if modelType != "" {
		query = query.Where("model_type = ?", modelType)
	}

	// 添加状态过滤
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// 计算总数
	countQuery := r.Builder.Select("COUNT(*)").From("models").Where("company_id = ?", companyID)
	if modelType != "" {
		countQuery = countQuery.Where("model_type = ?", modelType)
	}
	if status != "" {
		countQuery = countQuery.Where("status = ?", status)
	}

	countSQL, countArgs, err := countQuery.ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("ModelRepo - GetModelsWithPage - countQuery: %w", err)
	}

	var total int
	err = r.DB.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("ModelRepo - GetModelsWithPage - count: %w", err)
	}

	// 分页查询
	offset := (page - 1) * pageSize
	sql, args, err := query.OrderBy("created_at DESC").Limit(uint64(pageSize)).Offset(uint64(offset)).ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("ModelRepo - GetModelsWithPage - query: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("ModelRepo - GetModelsWithPage - r.DB.QueryContext: %w", err)
	}
	defer rows.Close()

	models := make([]*entity.Model, 0, pageSize)
	for rows.Next() {
		model := &entity.Model{}
		err = rows.Scan(
			&model.ID, &model.ProviderName, &model.ModelName, &model.BaseModel, &model.ModelType,
			&model.Credential, &model.Region, &model.EndpointID, &model.ApiEndpointHost,
			&model.Status, &model.ConnectivityStatus, &model.ContextLength, &model.IsDefault,
			&model.UserID, &model.CompanyID, &model.CreatedAt, &model.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("ModelRepo - GetModelsWithPage - rows.Scan: %w", err)
		}
		models = append(models, model)
	}

	return models, total, nil
}

// UpdateModelStatus -.
func (r *ModelRepo) UpdateModelStatus(ctx context.Context, id int64, status string) error {
	sql, args, err := r.Builder.
		Update("models").
		Set("status", status).
		Set("updated_at", time.Now().Unix()).
		Where("id = ?", id).
		ToSql()

	if err != nil {
		return fmt.Errorf("ModelRepo - UpdateModelStatus - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("ModelRepo - UpdateModelStatus - r.DB.ExecContext: %w", err)
	}

	return nil
}

// UpdateConnectivityStatus -.
func (r *ModelRepo) UpdateConnectivityStatus(ctx context.Context, id int64, connectivityStatus string) error {
	sql, args, err := r.Builder.
		Update("models").
		Set("connectivity_status", connectivityStatus).
		Set("updated_at", time.Now().Unix()).
		Where("id = ?", id).
		ToSql()

	if err != nil {
		return fmt.Errorf("ModelRepo - UpdateConnectivityStatus - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("ModelRepo - UpdateConnectivityStatus - r.DB.ExecContext: %w", err)
	}

	return nil
}

// SetDefaultModel -.
func (r *ModelRepo) SetDefaultModel(ctx context.Context, id int64, companyID int64, modelType string) error {
	// 开始事务
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("ModelRepo - SetDefaultModel - BeginTx: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 先将同类型的其他模型设置为非默认
	sql1, args1, err := r.Builder.
		Update("models").
		Set("is_default", false).
		Where("company_id = ? AND model_type = ?", companyID, modelType).
		ToSql()
	if err != nil {
		return fmt.Errorf("ModelRepo - SetDefaultModel - sql1: %w", err)
	}

	_, err = tx.ExecContext(ctx, sql1, args1...)
	if err != nil {
		return fmt.Errorf("ModelRepo - SetDefaultModel - tx.Exec1: %w", err)
	}

	// 将当前模型设置为默认
	sql2, args2, err := r.Builder.
		Update("models").
		Set("is_default", true).
		Set("updated_at", time.Now().Unix()).
		Where("id = ? AND company_id = ?", id, companyID).
		ToSql()
	if err != nil {
		return fmt.Errorf("ModelRepo - SetDefaultModel - sql2: %w", err)
	}

	_, err = tx.ExecContext(ctx, sql2, args2...)
	if err != nil {
		return fmt.Errorf("ModelRepo - SetDefaultModel - tx.Exec2: %w", err)
	}

	// 提交事务
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("ModelRepo - SetDefaultModel - Commit: %w", err)
	}

	return nil
}

// GetDefaultModel -.
func (r *ModelRepo) GetDefaultModel(ctx context.Context, companyID int64, modelType string) (*entity.Model, error) {
	sqlStr, args, err := r.Builder.
		Select(
			"id", "provider_name", "model_name", "base_model", "model_type",
			"credential", "region", "endpoint_id", "api_endpoint_host",
			"status", "connectivity_status", "context_length", "is_default",
			"user_id", "company_id", "created_at", "updated_at",
		).
		From("models").
		Where("company_id = ? AND model_type = ? AND is_default = ?", companyID, modelType, true).
		ToSql()

	if err != nil {
		return nil, fmt.Errorf("ModelRepo - GetDefaultModel - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sqlStr, args...)

	model := &entity.Model{}
	err = row.Scan(
		&model.ID, &model.ProviderName, &model.ModelName, &model.BaseModel, &model.ModelType,
		&model.Credential, &model.Region, &model.EndpointID, &model.ApiEndpointHost,
		&model.Status, &model.ConnectivityStatus, &model.ContextLength, &model.IsDefault,
		&model.UserID, &model.CompanyID, &model.CreatedAt, &model.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // 返回空结果，由上层处理默认逻辑
		}
		return nil, fmt.Errorf("ModelRepo - GetDefaultModel - row.Scan: %w", err)
	}

	return model, nil
}

// SetBuiltinDefaultModel -.
func (r *ModelRepo) SetBuiltinDefaultModel(ctx context.Context, companyID int64, modelType string, modelID string) (err error) {
	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("ModelRepo - SetBuiltinDefaultModel - BeginTx: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// 1. 将所有常规模型设为非默认
	sql1, args1, err := r.Builder.
		Update("models").
		Set("is_default", false).
		Where("company_id = ? AND model_type = ?", companyID, modelType).
		ToSql()
	if err != nil {
		return fmt.Errorf("ModelRepo - SetBuiltinDefaultModel - sql1: %w", err)
	}
	_, err = tx.ExecContext(ctx, sql1, args1...)
	if err != nil {
		return fmt.Errorf("ModelRepo - SetBuiltinDefaultModel - tx.Exec1: %w", err)
	}

	// 2. 删除之前创建的内置默认模型记录
	sql2, args2, err := r.Builder.
		Delete("models").
		Where("company_id = ? AND model_type = ? AND provider_name = ?", companyID, modelType, "builtin_default").
		ToSql()
	if err != nil {
		return fmt.Errorf("ModelRepo - SetBuiltinDefaultModel - sql2: %w", err)
	}
	_, err = tx.ExecContext(ctx, sql2, args2...)
	if err != nil {
		return fmt.Errorf("ModelRepo - SetBuiltinDefaultModel - tx.Exec2: %w", err)
	}

	// 3. 插入新的内置默认模型记录
	now := time.Now().Unix()
	sql3, args3, err := r.Builder.
		Insert("models").
		Columns(
			"provider_name", "model_name", "base_model", "model_type",
			"credential", "region", "endpoint_id", "api_endpoint_host",
			"status", "connectivity_status", "context_length", "is_default",
			"user_id", "company_id", "created_at", "updated_at",
		).
		Values(
			"builtin_default", modelID, "", modelType,
			"{}", "", "", "",
			"open", "success", 0, true,
			0, companyID, now, now,
		).
		ToSql()
	if err != nil {
		return fmt.Errorf("ModelRepo - SetBuiltinDefaultModel - sql3: %w", err)
	}
	_, err = tx.ExecContext(ctx, sql3, args3...)
	if err != nil {
		return fmt.Errorf("ModelRepo - SetBuiltinDefaultModel - tx.Exec3: %w", err)
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("ModelRepo - SetBuiltinDefaultModel - Commit: %w", err)
	}

	return nil
}

func (r *ModelRepo) GetModelPricing(ctx context.Context) (map[string]entity.ModelPricing, error) {
	pricing := make(map[string]entity.ModelPricing)
	data := config.PricingYAML

	var pricingConfig entity.ModelPricingConfig
	err := yaml.Unmarshal(data, &pricingConfig)
	if err != nil {
		return nil, err
	}

	for _, m := range pricingConfig.Models {
		pricing[m.ID] = m.ModelPricing
	}

	return pricing, nil
}
