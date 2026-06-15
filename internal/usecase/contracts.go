// Package usecase implements application business logic. Each logic group in own file.
package usecase

import (
	"context"

	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

type (
	// User
	User interface {
		// GetUserByID gets user by ID.
		GetUserInfo(ctx context.Context) (*entity.User, error)

		// GetUserByPhone gets user by phone number.
		GetUserByPhone(ctx context.Context, phone string) (*entity.User, error)

		GetUserByUsername(ctx context.Context, username string) (*entity.User, error)

		// GetUsersByCompany gets users by company ID with pagination.
		GetUsersByCompany(ctx context.Context, companyID int64, name, phone string, page, pageSize int) (*entity.UserList, error)

		// CreateUser creates a new user.
		CreateUser(ctx context.Context, user *entity.User) error

		// UpdateUser updates user information.
		UpdateUser(ctx context.Context, user *entity.User) error

		// DeleteUser soft deletes a user.
		DeleteUser(ctx context.Context, id int64) error

		// GetUserCount gets total user count.
		GetUserCount(ctx context.Context) (int, error)

		CheckPhoneExists(ctx context.Context, phone string, excludeID ...int) (bool, error)

		CheckUsernameExists(ctx context.Context, username string, excludeID ...int) (bool, error)
	}

	Company interface {
		GetCompanyByID(ctx context.Context, id int64) (*entity.Company, error)

		CreateCompany(ctx context.Context, company *entity.Company) error

		UpdateCompany(ctx context.Context, company *entity.Company) error

		AddCompanyBalance(ctx context.Context, id int64, addBalance int64) error

		DeleteCompanyBalance(ctx context.Context, id int64, deleteBalance int64) error

		ChangeManagerUserID(ctx context.Context, id int64, changeManagerUserID int) error
	}

	Auth interface {
		Login(ctx context.Context, username, password string) (string, error)
		GetInitStatus(ctx context.Context) (bool, error)
		Init(ctx context.Context, companyName, username, password string) (string, error)
	}

	// WebsiteLoginContext 网站登录上下文仓库接口
	WebsiteLoginContext interface {
		CreateWebsiteLoginContext(ctx context.Context, context *entity.WebsiteLoginContext) error
		UpdateWebsiteLoginContext(ctx context.Context, context *entity.WebsiteLoginContext) error
		DeleteWebsiteLoginContext(ctx context.Context, id int64) error
		GetWebsiteLoginContextByID(ctx context.Context, id int64) (*entity.WebsiteLoginContext, error)
		GetWebsiteLoginContextsWithPage(ctx context.Context, platform, purpose string, username string, tags []string, page, pageSize int) (*entity.WebsiteLoginContextList, error)
	}
)

// ImageLibrary 图片库用例接口
type AssetsLibrary interface {
	// UploadAsset 上传资产
	UploadAsset(ctx context.Context, asset *entity.AssetsLibrary, fileData []byte) error
	// GetAssetByID 根据ID获取资产
	GetAssetByID(ctx context.Context, id int64) (*entity.AssetsLibrary, error)
	// UpdateAsset 更新资产信息（仅更新描述、标签、是否公用）
	UpdateAsset(ctx context.Context, asset *entity.AssetsLibrary) error
	// DeleteAsset 删除资产
	DeleteAsset(ctx context.Context, id int64) error
	// GetAssetsWithPage 分页查询资产列表
	GetAssetsWithPage(ctx context.Context, tags []string, description string, isPublic *bool, assetType string, page, pageSize int) (*entity.AssetsLibraryList, error)
}

// MaterialLibrary 素材库用例接口
type MaterialLibrary interface {
	// CreateMaterial 创建素材
	CreateMaterial(ctx context.Context, material *entity.MaterialLibrary) error
	// GetMaterialByID 根据ID获取素材
	GetMaterialByID(ctx context.Context, id int64) (*entity.MaterialLibrary, error)
	// UpdateMaterial 更新素材信息
	UpdateMaterial(ctx context.Context, material *entity.MaterialLibrary) error
	// DeleteMaterial 删除素材
	DeleteMaterial(ctx context.Context, id int64) error
	// GetMaterialsWithPage 分页查询素材列表
	GetMaterialsWithPage(ctx context.Context, tags []string, title string, page, pageSize int) (*entity.MaterialLibraryList, error)
}

// Model 模型用例接口
type Model interface {
	// CreateModel 创建模型
	CreateModel(ctx context.Context, model *entity.Model) error
	// UpdateModel 更新模型
	UpdateModel(ctx context.Context, model *entity.Model) error
	// DeleteModel 删除模型
	DeleteModel(ctx context.Context, id int64) error
	// GetModelByID 根据ID获取模型
	GetModelByID(ctx context.Context, id int64) (*entity.Model, error)
	// GetModelsWithPage 分页查询模型列表
	GetModelsWithPage(ctx context.Context, modelType, status string, page, pageSize int) (*entity.ModelList, error)
	// UpdateModelStatus 更新模型状态（开启/关闭）
	UpdateModelStatus(ctx context.Context, id int64, status string) error
	// TestModelConnectivity 测试模型连接
	TestModelConnectivity(ctx context.Context, id int64) error
	// SetDefaultModel 设置默认模型
	SetDefaultModel(ctx context.Context, id int64) error
	// GetDefaultModel 获取默认模型
	GetDefaultModel(ctx context.Context, modelType string) (*entity.Model, error)
	// SetBuiltinDefaultModel 设置内置默认模型
	SetBuiltinDefaultModel(ctx context.Context, modelType string, modelID string) error
	// GetBuiltinDefaultModel 获取内置默认模型ID
	GetBuiltinDefaultModel(ctx context.Context, modelType string) (string, error)
	// GetModelPricing 获取模型计价配置
	GetModelPricing(ctx context.Context) (map[string]entity.ModelPricing, error)
}

// AIEOGenerate AIEO生成任务用例接口
type AIEOGenerate interface {
	// CreateAIEOGenerate 创建AIEO生成任务
	CreateAIEOGenerate(ctx context.Context, generate *entity.AIEOGenerate) error

	// GetAIEOGenerateByID 根据ID获取AIEO生成任务（包含创作内容）
	GetAIEOGenerateByID(ctx context.Context, id int64) (*response.AIEOGenerateDetailResponse, error)

	// UpdateAIEOGenerateContent 更新AIEO生成任务的创作内容
	UpdateAIEOGenerateContent(ctx context.Context, id int64, content entity.AIEOGenerateContents) error

	// UpdateAIEOGenerateStatus 更新AIEO生成任务状态（用于取消蒸馏）
	UpdateAIEOGenerateStatus(ctx context.Context, id int64, status string) error

	// DeleteAIEOGenerate 删除AIEO生成任务
	DeleteAIEOGenerate(ctx context.Context, id int64) error

	// GetAIEOGeneratesWithPage 分页查询AIEO生成任务列表，不返回创作内容
	GetAIEOGeneratesWithPage(ctx context.Context, name, keyword string, page, pageSize uint64) (*entity.AIEOGenerateList, error)

	// GenerateAIEOUserQuestion generate aieo user question
	GenerateAIEOUserQuestion(ctx context.Context, keyword, targetWord string, historyQuestions []string) (userQuestions []string, err error)

	// StartSend 开始发送AIEO生成任务
	StartSend(ctx context.Context, id int64, websiteLoginContextIDs []int64) error

	// ReportSendInfo 报告AIEO生成任务发送信息
	ReportSendInfo(ctx context.Context, id int64, sendInfo request.ReportSendInfoRequest) error

	// GetSendJob 获取AIEO生成任务发送信息
	GetSendJob(ctx context.Context) (*response.SendJobResponse, error)

	// GetMatrixStats 获取任务矩阵统计信息
	GetMatrixStats(ctx context.Context) (*response.MatrixStatsResponse, error)
}

// VideoJob 视频任务用例接口
type VideoJob interface {
	// CreateVideoJob 创建视频任务
	CreateVideoJob(ctx context.Context, videoJob *entity.VideoJob) error

	// GetVideoJobByID 根据ID获取视频任务
	GetVideoJobByID(ctx context.Context, id int64) (*entity.VideoJob, error)

	// UpdateVideoJobSendStatus 更新视频任务收录状态
	UpdateVideoJobSendStatus(ctx context.Context, id int64, status string, message string, recordID int64) error

	// GetVideoJobsWithPage 分页查询视频任务列表
	GetVideoJobsWithPage(ctx context.Context, title string, sendStatus string, assetsID int64, page, pageSize int) (*response.VideoJobList, error)

	// CancelVideoJob 取消视频任务
	CancelVideoJob(ctx context.Context, id int64) error
}

// Copywriting 方案设计专家用例接口
type Copywriting interface {
	// 会话管理
	CreateSession(ctx context.Context, session *entity.CopywritingSession) error
	GetSessionByID(ctx context.Context, id int64) (*entity.CopywritingSession, error)
	GetSessions(ctx context.Context, companyID int64, userID int64, page, pageSize int) (*entity.CopywritingSessionList, error)
	DeleteSession(ctx context.Context, id int64) error

	// 流式对话
	ChatStream(ctx context.Context, sessionID int64, userMessage string, modelID string, mode string,
		companyID int64, userID int64, companyInfo string, references []entity.ReferenceItem, onChunk func(chunk interface{}) error) error

	// 文件管理
	GetFilesBySessionID(ctx context.Context, sessionID int64) ([]*entity.CopywritingFile, error)
	GetFiles(ctx context.Context, companyID int64, userID int64, title string, page, pageSize int) (*entity.CopywritingFileList, error)
	GetFileByID(ctx context.Context, id int64) (*entity.CopywritingFile, error)
	UpdateFile(ctx context.Context, file *entity.CopywritingFile) error
	DeleteFile(ctx context.Context, id int64) error
	RecoverFile(ctx context.Context, id int64) error
}

// Billing 计费相关用例接口
type Billing interface {
	CalculateCost(ctx context.Context, modelID string, promptTokens, completionTokens int) (*entity.CostDetails, error)
	CheckBalance(ctx context.Context, companyID int64, modelID string) error
	DeductPoints(ctx context.Context, companyID, userID, sessionID int64, modelID string, promptTokens, completionTokens int, durationMs int64, finishReason, contentPreview string) (int64, error)
	GetTransactions(ctx context.Context, companyID int64, page, pageSize int) (*entity.TransactionHistoryList, error)
	GetUsageLogs(ctx context.Context, companyID int64, modelID string, page, pageSize int) (*entity.UsageLogList, error)
	DirectRecharge(ctx context.Context, companyID, userID int64, amount int64, paymentMethod, remark string) error
}
