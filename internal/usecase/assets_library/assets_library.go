package assets_library

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
)

// AssetsLibrary -.
type AssetsLibrary struct {
	repo repo.AssetsLibraryRepo
}

// New -.
func New(r repo.AssetsLibraryRepo) *AssetsLibrary {
	return &AssetsLibrary{
		repo: r,
	}
}

// UploadImage 上传图片
func (uc *AssetsLibrary) UploadAsset(ctx context.Context, asset *entity.AssetsLibrary, fileData []byte) error {
	// 从上下文获取公司ID和用户ID
	companyID := ctx.Value(constants.CompanyID).(int64)
	userID := ctx.Value(constants.UserID).(int64)

	// 设置公司ID和用户ID
	asset.CompanyID = companyID
	asset.UserID = userID

	// 生成UUID作为文件名
	uniqueID := uuid.New().String()

	// 获取当前年月，用于创建目录和文件路径
	now := time.Now()
	yearMonth := now.Format("200601")

	// 构建文件路径：年/月/uuid.后缀
	fileName := fmt.Sprintf("%s/%s.%s", yearMonth, uniqueID, asset.Suffix)
	filePath := filepath.Join(config.GetConfig().App.AssetsLibraryPath, fileName)

	// 创建目录结构
	dirPath := filepath.Dir(filePath)
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - UploadAsset - os.MkdirAll: %w", err)
	}

	// 写入文件
	if err := os.WriteFile(filePath, fileData, 0644); err != nil {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - UploadAsset - os.WriteFile: %w", err)
	}

	// 保存图片信息到数据库
	asset.Path = fmt.Sprintf("%s/%s.%s", yearMonth, uniqueID, asset.Suffix)
	err := uc.repo.CreateAssetsLibrary(ctx, asset)
	if err != nil {
		// 如果数据库保存失败，删除已上传的文件
		_ = os.Remove(filePath)
		return fmt.Errorf("AssetsLibraryAssetsLibrary - UploadAsset - uc.repo.CreateAssetsLibrary: %w", err)
	}

	return nil
}

// GetImageByID 根据ID获取图片
func (uc *AssetsLibrary) GetAssetByID(ctx context.Context, id int64) (*entity.AssetsLibrary, error) {
	asset, err := uc.repo.GetAssetsLibraryByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("AssetsLibraryAssetsLibrary - GetAssetByID - uc.repo.GetAssetsLibraryByID: %w", err)
	}

	// 权限校验：只能查看自己公司的图片或公开的图片
	companyID := ctx.Value(constants.CompanyID).(int64)
	userID := ctx.Value(constants.UserID).(int64)

	if asset.CompanyID != companyID && !asset.IsPublic {
		return nil, fmt.Errorf("AssetsLibraryAssetsLibrary - GetAssetByID - permission denied")
	}

	// 如果是私有资产，还需要检查是否是资产所有者
	if !asset.IsPublic && asset.UserID != userID {
		return nil, fmt.Errorf("AssetsLibraryAssetsLibrary - GetAssetByID - permission denied")
	}

	return asset, nil
}

// UpdateAsset 更新资产信息（仅更新描述、标题、标签、是否公用）
func (uc *AssetsLibrary) UpdateAsset(ctx context.Context, asset *entity.AssetsLibrary) error {
	// 先查询现有记录
	dbAsset, err := uc.repo.GetAssetsLibraryByID(ctx, asset.ID)
	if err != nil {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - UpdateAsset - uc.repo.GetAssetsLibraryByID: %w", err)
	}

	// 权限校验：只能修改自己公司的图片
	companyID := ctx.Value(constants.CompanyID).(int64)
	if dbAsset.CompanyID != companyID {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - UpdateAsset - permission denied")
	}

	// 权限校验：只能修改自己上传的图片
	userID := ctx.Value(constants.UserID).(int64)
	if dbAsset.UserID != userID {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - UpdateAsset - permission denied")
	}

	// 只允许更新指定字段
	dbAsset.Description = asset.Description
	dbAsset.Tags = asset.Tags
	dbAsset.IsPublic = asset.IsPublic
	dbAsset.Title = asset.Title

	err = uc.repo.UpdateAssetsLibrary(ctx, dbAsset)
	if err != nil {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - UpdateAsset - uc.repo.UpdateAssetsLibrary: %w", err)
	}

	return nil
}

// DeleteAsset 删除资产
func (uc *AssetsLibrary) DeleteAsset(ctx context.Context, id int64) error {
	// 先查询现有记录
	asset, err := uc.repo.GetAssetsLibraryByID(ctx, id)
	if err != nil {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - DeleteAsset - uc.repo.GetAssetsLibraryByID: %w", err)
	}
	// 权限校验：只能删除自己公司的资产
	companyID := ctx.Value(constants.CompanyID).(int64)
	if asset.CompanyID != companyID {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - DeleteAsset - permission denied")
	}

	// 权限校验：只能删除自己上传的资产
	userID := ctx.Value(constants.UserID).(int64)
	if asset.UserID != userID {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - DeleteAsset - permission denied")
	}

	// 从数据库删除
	err = uc.repo.DeleteAssetsLibrary(ctx, id)
	if err != nil {
		return fmt.Errorf("AssetsLibraryAssetsLibrary - DeleteAsset - uc.repo.DeleteAssetsLibrary: %w", err)
	}

	// 删除物理文件
	// image.ImagePath格式为：202511/5ce4b962-ea14-47d4-b272-1a4afa888828.jpg
	filePath := filepath.Join(config.GetConfig().App.AssetsLibraryPath, asset.Path)

	// 尝试删除文件，但不影响主流程
	_ = os.Remove(filePath)

	return nil
}

// GetAssetsWithPage 分页查询图片列表
func (uc *AssetsLibrary) GetAssetsWithPage(ctx context.Context, tags []string, description string, isPublic *bool, assetType string, page, pageSize int) (*entity.AssetsLibraryList, error) {
	companyID := ctx.Value(constants.CompanyID).(int64)
	userID := ctx.Value(constants.UserID).(int64)

	assets, total, err := uc.repo.GetAssetsLibrariesWithPage(ctx, companyID, tags, description, isPublic, userID, assetType, nil, page, pageSize)
	if err != nil {
		return nil, fmt.Errorf("AssetsLibraryAssetsLibrary - GetAssetsWithPage - uc.repo.GetAssetsLibrariesWithPage: %w", err)
	}

	return &entity.AssetsLibraryList{
		Assets: assets,
		Total:  total,
		Page:   page,
		Size:   pageSize,
	}, nil
}
