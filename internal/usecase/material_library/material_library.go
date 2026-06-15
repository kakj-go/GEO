package material_library

import (
	"context"
	"fmt"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
)

// MaterialLibrary -.
type MaterialLibrary struct {
	repo repo.MaterialLibraryRepo
}

// New -.
func New(r repo.MaterialLibraryRepo) *MaterialLibrary {
	return &MaterialLibrary{
		repo: r,
	}
}

// CreateMaterial 创建素材
func (uc *MaterialLibrary) CreateMaterial(ctx context.Context, material *entity.MaterialLibrary) error {
	// 获取用户ID和公司ID
	userID := ctx.Value(constants.UserID).(int64)
	companyID := ctx.Value(constants.CompanyID).(int64)

	material.UserID = userID
	material.CompanyID = companyID

	// 创建素材
	err := uc.repo.CreateMaterialLibrary(ctx, material)
	if err != nil {
		return fmt.Errorf("MaterialLibrary - CreateMaterial - uc.repo.CreateMaterialLibrary: %w", err)
	}

	return nil
}

// GetMaterialByID 根据ID获取素材
func (uc *MaterialLibrary) GetMaterialByID(ctx context.Context, id int64) (*entity.MaterialLibrary, error) {
	material, err := uc.repo.GetMaterialLibraryByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("MaterialLibrary - GetMaterialByID - uc.repo.GetMaterialLibraryByID: %w", err)
	}

	// 权限校验：只能查看自己公司的素材
	companyID := ctx.Value(constants.CompanyID).(int64)
	userID := ctx.Value(constants.UserID).(int64)

	if material.CompanyID != companyID {
		return nil, fmt.Errorf("MaterialLibrary - GetMaterialByID - permission denied")
	}

	// 只能查看自己创建的素材
	if material.UserID != userID {
		return nil, fmt.Errorf("MaterialLibrary - GetMaterialByID - permission denied")
	}

	return material, nil
}

// UpdateMaterial 更新素材信息
func (uc *MaterialLibrary) UpdateMaterial(ctx context.Context, material *entity.MaterialLibrary) error {
	// 首先获取原素材信息进行权限校验
	originalMaterial, err := uc.repo.GetMaterialLibraryByID(ctx, material.ID)
	if err != nil {
		return fmt.Errorf("MaterialLibrary - UpdateMaterial - uc.repo.GetMaterialLibraryByID: %w", err)
	}

	// 权限校验：只能更新自己公司和自己创建的素材
	companyID := ctx.Value(constants.CompanyID).(int64)
	userID := ctx.Value(constants.UserID).(int64)

	if originalMaterial.CompanyID != companyID || originalMaterial.UserID != userID {
		return fmt.Errorf("MaterialLibrary - UpdateMaterial - permission denied")
	}

	// 执行更新
	err = uc.repo.UpdateMaterialLibrary(ctx, material)
	if err != nil {
		return fmt.Errorf("MaterialLibrary - UpdateMaterial - uc.repo.UpdateMaterialLibrary: %w", err)
	}

	return nil
}

// DeleteMaterial 删除素材
func (uc *MaterialLibrary) DeleteMaterial(ctx context.Context, id int64) error {
	// 首先获取素材信息进行权限校验
	material, err := uc.repo.GetMaterialLibraryByID(ctx, id)
	if err != nil {
		return fmt.Errorf("MaterialLibrary - DeleteMaterial - uc.repo.GetMaterialLibraryByID: %w", err)
	}

	// 权限校验：只能删除自己公司和自己创建的素材
	companyID := ctx.Value(constants.CompanyID).(int64)
	userID := ctx.Value(constants.UserID).(int64)

	if material.CompanyID != companyID || material.UserID != userID {
		return fmt.Errorf("MaterialLibrary - DeleteMaterial - permission denied")
	}

	// 执行删除
	err = uc.repo.DeleteMaterialLibrary(ctx, id)
	if err != nil {
		return fmt.Errorf("MaterialLibrary - DeleteMaterial - uc.repo.DeleteMaterialLibrary: %w", err)
	}

	return nil
}

// GetMaterialsWithPage 分页查询素材列表
func (uc *MaterialLibrary) GetMaterialsWithPage(ctx context.Context, tags []string, title string, page, pageSize int) (*entity.MaterialLibraryList, error) {
	companyID := ctx.Value(constants.CompanyID).(int64)
	userID := ctx.Value(constants.UserID).(int64)

	materials, total, err := uc.repo.GetMaterialLibrariesWithPage(ctx, companyID, tags, title, userID, page, pageSize, nil)
	if err != nil {
		return nil, fmt.Errorf("MaterialLibrary - GetMaterialsWithPage - uc.repo.GetMaterialLibrariesWithPage: %w", err)
	}

	return &entity.MaterialLibraryList{
		Materials: materials,
		Total:     total,
		Page:      page,
		Size:      pageSize,
	}, nil
}
