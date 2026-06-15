// Package repo implements application outer layer logic. Each logic group in own file.
package repo

import (
	"context"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

type (
	UserRepo interface {
		GetUserByID(ctx context.Context, id int64) (*entity.User, error)

		GetUserByPhone(ctx context.Context, phone string) (*entity.User, error)

		GetUserByUsername(ctx context.Context, username string) (*entity.User, error)

		// GetUsersWithPage - 分页查询用户，支持 name, phone 查询
		GetUsersWithPage(ctx context.Context, companyID int64, name, phone string, page, pageSize int) ([]*entity.User, int, error)

		CreateUser(ctx context.Context, user *entity.User) error

		UpdateUser(ctx context.Context, user *entity.User) error

		SoftDeleteUser(ctx context.Context, id int64) error

		CountUsers(ctx context.Context) (int, error)

		CheckPhoneExists(ctx context.Context, phone string, excludeID ...int) (bool, error)

		CheckUsernameExists(ctx context.Context, username string, excludeID ...int) (bool, error)
	}
)

type (
	CompanyRepo interface {
		GetCompanyByID(ctx context.Context, id int64) (*entity.Company, error)

		CreateCompany(ctx context.Context, company *entity.Company) error

		UpdateCompany(ctx context.Context, company *entity.Company) error

		AddCompanyBalance(ctx context.Context, id int64, addBalance int64) error

		DeleteCompanyBalance(ctx context.Context, id int64, deleteBalance int64) error

		ChangeManagerUserID(ctx context.Context, id int64, changeManagerUserID int) error

		AnyExists(ctx context.Context) (bool, error)
	}
)

type (
	WebsiteLoginContextRepo interface {
		CreateWebsiteLoginContext(ctx context.Context, context *entity.WebsiteLoginContext) error

		// UpdateWebsiteLoginContext - 只允许修改 browser_context, tags, status
		UpdateWebsiteLoginContext(ctx context.Context, context *entity.WebsiteLoginContext) error

		// DeleteWebsiteLoginContext - 硬删除
		DeleteWebsiteLoginContext(ctx context.Context, id int64) error

		// GetWebsiteLoginContextByID -.
		GetWebsiteLoginContextByID(ctx context.Context, id int64) (*entity.WebsiteLoginContext, error)

		// GetWebsiteLoginContextsWithPage - 分页查询，支持 tags, purpose, platform 查询
		GetWebsiteLoginContextsWithPage(ctx context.Context, companyID int64, platform, purpose string, username string, tags []string, ids []int64, page, pageSize int) ([]*entity.WebsiteLoginContext, int, error)
		IncrementTodayCount(ctx context.Context, id int64) error
		ResetTodayCount(ctx context.Context, id int64) error
	}
)

// ModelRepo 模型仓库接口
type (
	ModelRepo interface {
		// CreateModel 创建模型记录
		CreateModel(ctx context.Context, model *entity.Model) error

		// UpdateModel 更新模型记录
		UpdateModel(ctx context.Context, model *entity.Model) error

		// DeleteModel 删除模型记录
		DeleteModel(ctx context.Context, id int64) error

		// GetModelByID 根据ID获取模型记录
		GetModelByID(ctx context.Context, id int64) (*entity.Model, error)

		// GetModelsWithPage 分页查询模型列表，支持模型类型和状态查询
		GetModelsWithPage(ctx context.Context, companyID int64, modelType, status string, page, pageSize int) ([]*entity.Model, int, error)

		// UpdateModelStatus 更新模型状态（开启/关闭）
		UpdateModelStatus(ctx context.Context, id int64, status string) error

		// UpdateConnectivityStatus 更新模型连接状态
		UpdateConnectivityStatus(ctx context.Context, id int64, connectivityStatus string) error

		// SetDefaultModel 设置默认模型
		SetDefaultModel(ctx context.Context, id int64, companyID int64, modelType string) error

		// GetDefaultModel 获取默认模型
		GetDefaultModel(ctx context.Context, companyID int64, modelType string) (*entity.Model, error)

		// SetBuiltinDefaultModel 专门用于内置模型设置默认，不依赖存在的自建模型
		SetBuiltinDefaultModel(ctx context.Context, companyID int64, modelType string, modelID string) error

		// GetModelPricing 获取模型计价信息
		GetModelPricing(ctx context.Context) (map[string]entity.ModelPricing, error)
	}
)

// AssetsLibraryRepo 图片库仓库接口
type (
	AssetsLibraryRepo interface {
		// CreateImageLibrary 创建图片库记录
		CreateAssetsLibrary(ctx context.Context, asset *entity.AssetsLibrary) error

		// UpdateImageLibrary 更新图片库记录（只更新描述、tags、是否公用）
		UpdateAssetsLibrary(ctx context.Context, asset *entity.AssetsLibrary) error

		// DeleteAssetsLibrary 删除资产库记录
		DeleteAssetsLibrary(ctx context.Context, id int64) error

		// GetAssetsLibraryByID 根据ID获取资产库记录
		GetAssetsLibraryByID(ctx context.Context, id int64) (*entity.AssetsLibrary, error)

		// GetAssetsLibrariesWithPage 分页查询资产库列表，支持标签和是否公用查询
		GetAssetsLibrariesWithPage(ctx context.Context, companyID int64, tags []string, description string, isPublic *bool, userID int64, assetTypes string, ids []int64, page, pageSize int) ([]*entity.AssetsLibrary, int, error)
	}
)

// MaterialLibraryRepo 素材库仓库接口
type (
	MaterialLibraryRepo interface {
		// CreateMaterialLibrary 创建素材库记录
		CreateMaterialLibrary(ctx context.Context, material *entity.MaterialLibrary) error

		// UpdateMaterialLibrary 更新素材库记录
		UpdateMaterialLibrary(ctx context.Context, material *entity.MaterialLibrary) error

		// DeleteMaterialLibrary 删除素材库记录
		DeleteMaterialLibrary(ctx context.Context, id int64) error

		// GetMaterialLibraryByID 根据ID获取素材库记录
		GetMaterialLibraryByID(ctx context.Context, id int64) (*entity.MaterialLibrary, error)

		// GetMaterialLibrariesWithPage 分页查询素材库列表，支持标签和标题查询
		GetMaterialLibrariesWithPage(ctx context.Context, companyID int64, tags []string, title string, userID int64, page, pageSize int, ids []int64) ([]*entity.MaterialLibrary, int, error)
	}
)

// AIEOGenerateRepo AIEO生成任务仓库接口
type AIEOGenerateRepo interface {
	// CreateAIEOGenerate 创建AIEO生成任务
	CreateAIEOGenerate(ctx context.Context, generate *entity.AIEOGenerate) error

	// GetAIEOGenerateByID 根据ID获取AIEO生成任务
	GetAIEOGenerateByID(ctx context.Context, id int64) (*entity.AIEOGenerate, error)

	// UpdateAIEOGenerateContent 更新AIEO生成任务的创作内容
	UpdateAIEOGenerateContent(ctx context.Context, id int64, content entity.AIEOGenerateContents) error

	// UpdateAIEOGenerateStatus 更新AIEO生成任务状态
	UpdateAIEOGenerateStatus(ctx context.Context, id int64, status string, errorLog string) error

	// UpdateAIEOGenerate 更新AIEO生成任务
	UpdateAIEOGenerateSends(ctx context.Context, id int64, sendStatus string, errorLog string, sendInfos entity.SendInfos) error

	// DeleteAIEOGenerate 删除AIEO生成任务
	DeleteAIEOGenerate(ctx context.Context, id int64) error

	// GetAIEOGeneratesWithPage 分页查询AIEO生成任务列表，不返回创作内容
	GetAIEOGeneratesWithPage(ctx context.Context, companyID int64, name, keyword string, status string, sendStatus string, withContent bool, page, pageSize uint64) ([]*entity.AIEOGenerate, int, error)

	// CountAIEOGenerates 统计AIEO生成任务数量
	CountAIEOGenerates(ctx context.Context, companyID int64, sendStatus string) (int64, error)
}

// VideoJobRepo 视频任务仓库接口
type VideoJobRepo interface {
	// CreateVideoJob 创建视频任务
	CreateVideoJob(ctx context.Context, videoJob *entity.VideoJob) error

	// GetVideoJobByID 根据ID获取视频任务
	GetVideoJobByID(ctx context.Context, id int64) (*entity.VideoJob, error)

	// UpdateVideoJobSendStatus 更新视频任务收录状态
	UpdateVideoJobSendStatus(ctx context.Context, id int64, sendStatus string, errorLog string, sendInfos entity.VideoSendInfos) error

	// GetVideoJobsWithPage 分页查询视频任务列表
	GetVideoJobsWithPage(ctx context.Context, companyID int64, title string, sendStatus string, assetsID int64, page, pageSize uint64) ([]*entity.VideoJob, int, error)

	// CountVideoJobs 统计视频任务数量
	CountVideoJobs(ctx context.Context, companyID int64, sendStatus string) (int64, error)
}

// BillingRepo 计费相关仓库接口
type BillingRepo interface {
	CreateTransaction(ctx context.Context, tx *entity.TransactionHistory) error
	CreateUsageLog(ctx context.Context, log *entity.UsageLog) error
	GetTransactionsWithPage(ctx context.Context, companyID int64, page, pageSize int) ([]*entity.TransactionHistory, int, error)
	GetUsageLogsWithPage(ctx context.Context, companyID int64, modelID string, page, pageSize int) ([]*entity.UsageLog, int, error)
}

// CopywritingRepo 方案设计专家仓库接口
type CopywritingRepo interface {
	// Session CRUD
	CreateSession(ctx context.Context, session *entity.CopywritingSession) error
	GetSessionByID(ctx context.Context, id int64) (*entity.CopywritingSession, error)
	UpdateSession(ctx context.Context, session *entity.CopywritingSession) error
	DeleteSession(ctx context.Context, id int64) error
	GetSessionsWithPage(ctx context.Context, companyID int64, userID int64, page, pageSize int) ([]*entity.CopywritingSession, int, error)

	// File CRUD
	CreateFile(ctx context.Context, file *entity.CopywritingFile) error
	GetFileByID(ctx context.Context, id int64) (*entity.CopywritingFile, error)
	GetFilesBySessionID(ctx context.Context, sessionID int64) ([]*entity.CopywritingFile, error)
	UpdateFile(ctx context.Context, file *entity.CopywritingFile) error
	DeleteFile(ctx context.Context, id int64) error
	RecoverFile(ctx context.Context, id int64) error
	GetFilesWithPage(ctx context.Context, companyID int64, userID int64, title string, page, pageSize int) ([]*entity.CopywritingFile, int, error)
}
