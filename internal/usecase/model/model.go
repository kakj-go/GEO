package model

import (
	"context"
	"fmt"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
	"github.com/kakj-go/llm_reference_matrix/pkg/llm"
)

// UseCase -.
type UseCase struct {
	repo repo.ModelRepo
}

// New -.
func New(r repo.ModelRepo) *UseCase {
	return &UseCase{
		repo: r,
	}
}

// CreateModel -.
func (uc *UseCase) CreateModel(ctx context.Context, model *entity.Model) error {
	// 设置公司ID和用户ID
	model.UserID = ctx.Value(constants.UserID).(int64)
	model.CompanyID = ctx.Value(constants.CompanyID).(int64)

	// 设置默认状态
	model.Status = "open"
	if model.ProviderName == "jimeng" || model.ProviderName == "klingai" {
		model.ConnectivityStatus = "success"
	} else {
		model.ConnectivityStatus = "not_tested"
	}
	model.IsDefault = false

	return uc.repo.CreateModel(ctx, model)
}

// UpdateModel -.
func (uc *UseCase) UpdateModel(ctx context.Context, model *entity.Model) error {
	// 获取现有模型信息
	existingModel, err := uc.repo.GetModelByID(ctx, model.ID)
	if err != nil {
		return fmt.Errorf("ModelUseCase - UpdateModel - uc.repo.GetModelByID: %w", err)
	}

	// 验证权限（确保只能修改自己公司的模型）
	companyID := ctx.Value(constants.CompanyID).(int64)
	if existingModel.CompanyID != companyID {
		return fmt.Errorf("ModelUseCase - UpdateModel - permission denied")
	}

	existingModel.BaseModel = model.BaseModel
	existingModel.ModelName = model.ModelName
	existingModel.Credential = model.Credential
	existingModel.Region = model.Region
	existingModel.EndpointID = model.EndpointID
	existingModel.ApiEndpointHost = model.ApiEndpointHost
	existingModel.ContextLength = model.ContextLength

	return uc.repo.UpdateModel(ctx, existingModel)
}

// DeleteModel -.
func (uc *UseCase) DeleteModel(ctx context.Context, id int64) error {
	// 获取模型信息验证权限
	model, err := uc.repo.GetModelByID(ctx, id)
	if err != nil {
		return fmt.Errorf("ModelUseCase - DeleteModel - uc.repo.GetModelByID: %w", err)
	}

	// 验证权限
	companyID := ctx.Value(constants.CompanyID).(int64)
	if model.CompanyID != companyID {
		return fmt.Errorf("ModelUseCase - DeleteModel - permission denied")
	}

	return uc.repo.DeleteModel(ctx, id)
}

// GetModelByID -.
func (uc *UseCase) GetModelByID(ctx context.Context, id int64) (*entity.Model, error) {
	model, err := uc.repo.GetModelByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("ModelUseCase - GetModelByID - uc.repo.GetModelByID: %w", err)
	}

	// 验证权限
	if ctx.Value(constants.CompanyID) != nil {
		companyID := ctx.Value(constants.CompanyID).(int64)
		if model.CompanyID != companyID {
			return nil, fmt.Errorf("ModelUseCase - GetModelByID - permission denied")
		}
	}

	return model, nil
}

// GetModelsWithPage -.
func (uc *UseCase) GetModelsWithPage(ctx context.Context, modelType, status string, page, pageSize int) (*entity.ModelList, error) {
	companyID := ctx.Value(constants.CompanyID).(int64)

	models, total, err := uc.repo.GetModelsWithPage(ctx, companyID, modelType, status, page, pageSize)
	if err != nil {
		return nil, fmt.Errorf("ModelUseCase - GetModelsWithPage - uc.repo.GetModelsWithPage: %w", err)
	}

	return &entity.ModelList{
		Models: models,
		Total:  total,
		Page:   page,
		Size:   pageSize,
	}, nil
}

// UpdateModelStatus -.
func (uc *UseCase) UpdateModelStatus(ctx context.Context, id int64, status string) error {
	// 验证状态值
	if status != "open" && status != "close" {
		return fmt.Errorf("ModelUseCase - UpdateModelStatus - invalid status value")
	}

	// 获取模型信息验证权限
	model, err := uc.repo.GetModelByID(ctx, id)
	if err != nil {
		return fmt.Errorf("ModelUseCase - UpdateModelStatus - uc.repo.GetModelByID: %w", err)
	}

	// 验证权限
	companyID := ctx.Value(constants.CompanyID).(int64)
	if model.CompanyID != companyID {
		return fmt.Errorf("ModelUseCase - UpdateModelStatus - permission denied")
	}

	return uc.repo.UpdateModelStatus(ctx, id, status)
}

// TestModelConnectivity -.
func (uc *UseCase) TestModelConnectivity(ctx context.Context, id int64) error {
	// 获取模型信息
	model, err := uc.repo.GetModelByID(ctx, id)
	if err != nil {
		return fmt.Errorf("ModelUseCase - TestModelConnectivity - uc.repo.GetModelByID: %w", err)
	}

	// 验证权限
	companyID := ctx.Value(constants.CompanyID).(int64)
	if model.CompanyID != companyID {
		return fmt.Errorf("ModelUseCase - TestModelConnectivity - permission denied")
	}

	// 模拟连接测试（实际应用中需要根据不同的模型提供商实现具体的连接测试逻辑）
	connectivityStatus := "failed"
	err = uc.testConnection(model)
	if err == nil {
		connectivityStatus = "success"
	}

	// 更新连接状态
	updateError := uc.repo.UpdateConnectivityStatus(ctx, id, connectivityStatus)
	if updateError != nil {
		return fmt.Errorf("ModelUseCase - TestModelConnectivity - uc.repo.UpdateConnectivityStatus: %w", err)
	}

	if connectivityStatus == "failed" {
		return err
	}

	return nil
}

// testConnection 模拟连接测试
func (uc *UseCase) testConnection(model *entity.Model) error {
	// 帮我根据 provider_name 为火山方舟的模型实现连接测试
	if model.ProviderName == "volcengine" {
		if model.ModelType == "llm" {
			_, _, err := llm.Chat(context.Background(), &llm.ModelInfo{
				ApiEndpointHost: model.ApiEndpointHost,
				EndpointID:      model.EndpointID,
				ModelName:       model.ModelName,
				BaseModel:       model.BaseModel,
				ApiKey:          model.Credential.ApiKey,
				MaxToken:        model.ContextLength,
			}, "test", "test")
			if err != nil {
				return fmt.Errorf("ModelUseCase - testConnection - VolcanoChat: %w", err)
			}
			return nil
		} else if model.ModelType == "embedding" {
			// todo 实现火山方舟的 embedding 模型连接测试
		} else {
			return fmt.Errorf("ModelUseCase - testConnection - invalid model type")
		}
	} else {
		return fmt.Errorf("ModelUseCase - testConnection - invalid provider name")
	}
	return nil
}

// SetDefaultModel -.
func (uc *UseCase) SetDefaultModel(ctx context.Context, id int64) error {
	// 获取模型信息
	model, err := uc.repo.GetModelByID(ctx, id)
	if err != nil {
		return fmt.Errorf("ModelUseCase - SetDefaultModel - uc.repo.GetModelByID: %w", err)
	}

	// 验证权限
	companyID := ctx.Value(constants.CompanyID).(int64)
	if model.CompanyID != companyID {
		return fmt.Errorf("ModelUseCase - SetDefaultModel - permission denied")
	}

	return uc.repo.SetDefaultModel(ctx, id, model.CompanyID, model.ModelType)
}

// GetDefaultModel -.
func (uc *UseCase) GetDefaultModel(ctx context.Context, modelType string) (*entity.Model, error) {
	companyID := ctx.Value(constants.CompanyID).(int64)

	return uc.repo.GetDefaultModel(ctx, companyID, modelType)
}

// SetBuiltinDefaultModel -.
func (uc *UseCase) SetBuiltinDefaultModel(ctx context.Context, modelType string, modelID string) error {
	companyID := ctx.Value(constants.CompanyID).(int64)
	return uc.repo.SetBuiltinDefaultModel(ctx, companyID, modelType, modelID)
}

// GetBuiltinDefaultModel -.
func (uc *UseCase) GetBuiltinDefaultModel(ctx context.Context, modelType string) (string, error) {
	companyID := ctx.Value(constants.CompanyID).(int64)
	model, err := uc.repo.GetDefaultModel(ctx, companyID, modelType)
	if err != nil || model == nil {
		return "", nil // 没有默认模型或发生错误时返回空字符串
	}
	if model.ProviderName == "builtin_default" {
		return model.ModelName, nil
	}
	return model.BaseModel, nil
}

// GetModelPricing -.
func (uc *UseCase) GetModelPricing(ctx context.Context) (map[string]entity.ModelPricing, error) {
	return uc.repo.GetModelPricing(ctx)
}
