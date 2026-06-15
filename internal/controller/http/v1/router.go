package v1

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/usecase"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
)

// NewUserRoutes -.
// 修改 NewUserRoutes 函数，添加 imageLibrary 参数
func NewUserRoutes(
	apiV1Group fiber.Router,
	user usecase.User,
	company usecase.Company,
	auth usecase.Auth,
	websiteLoginContext usecase.WebsiteLoginContext,
	assetsLibrary usecase.AssetsLibrary,
	materialLibrary usecase.MaterialLibrary,
	model usecase.Model,
	generate usecase.AIEOGenerate,
	videoJob usecase.VideoJob,
	copywriting usecase.Copywriting,
	billing usecase.Billing,
	l logger.Interface,
) {
	r := &V1{
		user:                user,
		company:             company,
		auth:                auth,
		websiteLoginContext: websiteLoginContext,
		assetsLibrary:       assetsLibrary,
		materialLibrary:     materialLibrary,
		l:                   l,
		model:               model,
		generate:            generate,
		videoJob:            videoJob,
		copywriting:         copywriting,
		billing:             billing,
		v:                   validator.New(validator.WithRequiredStructEnabled()),
	}

	userGroup := apiV1Group.Group("/user")
	{
		userGroup.Get("/company/:company_id", r.getUsersByCompany)
		userGroup.Post("/", r.createUser)
		userGroup.Put("/:id", r.updateUser)
		userGroup.Delete("/:id", r.deleteUser)
		userGroup.Get("/check_username", r.checkUsernameExists)
		userGroup.Get("/check_phone", r.checkPhoneExists)
		userGroup.Get("/user_info", r.getUserInfo)
	}

	companyGroup := apiV1Group.Group("/company")
	{
		companyGroup.Get("/:id", r.getCompanyByID)
		companyGroup.Post("/", r.createCompany)
		companyGroup.Put("/:id", r.updateCompany)
		companyGroup.Post("/:id/balance/add", r.addCompanyBalance)
		companyGroup.Post("/:id/balance/delete", r.deleteCompanyBalance)
		companyGroup.Put("/:id/manager", r.changeManagerUserID)
		companyGroup.Get("/:id/transactions", r.getTransactions)
		companyGroup.Get("/:id/usage_logs", r.getUsageLogs)
		companyGroup.Post("/:id/recharge", r.directRecharge)
	}

	authGroup := apiV1Group.Group("/auth")
	{
		authGroup.Post("/login", r.login)
		authGroup.Get("/init_status", r.getInitStatus)
		authGroup.Post("/init", r.initSystem)
	}

	websiteLoginContextGroup := apiV1Group.Group("/website_login_context")
	{
		websiteLoginContextGroup.Post("/", r.createWebsiteLoginContext)
		websiteLoginContextGroup.Get("/", r.getWebsiteLoginContexts)
		websiteLoginContextGroup.Get("/get_webside_infos", r.getWebsideInfos)
		websiteLoginContextGroup.Put("/:id", r.updateWebsiteLoginContext)
		websiteLoginContextGroup.Delete("/:id", r.deleteWebsiteLoginContext)
		websiteLoginContextGroup.Get("/:id", r.getWebsiteLoginContext)
	}

	// 添加图片库路由
	assetsLibraryGroup := apiV1Group.Group("/assets_library")
	{
		assetsLibraryGroup.Post("/", r.uploadAsset)
		assetsLibraryGroup.Get("/", r.getAssets)
		assetsLibraryGroup.Get("/:id", r.getAsset)
		assetsLibraryGroup.Put("/:id", r.updateAsset)
		assetsLibraryGroup.Delete("/:id", r.deleteAsset)
	}

	materialLibraryGroup := apiV1Group.Group("/material_library")
	{
		materialLibraryGroup.Post("/", r.createMaterial)
		materialLibraryGroup.Get("/", r.getMaterials)
		materialLibraryGroup.Get("/:id", r.getMaterial)
		materialLibraryGroup.Put("/:id", r.updateMaterial)
		materialLibraryGroup.Delete("/:id", r.deleteMaterial)
	}

	modelGroup := apiV1Group.Group("/model")
	{
		modelGroup.Post("/", r.CreateModel)
		modelGroup.Get("/", r.GetModels)
		modelGroup.Get("/get_default", r.GetDefaultModel)
		modelGroup.Post("/builtin_default", r.SetBuiltinDefaultModel)
		modelGroup.Get("/builtin_default", r.GetBuiltinDefaultModel)
		modelGroup.Get("/builtin_defaults", r.GetAllBuiltinDefaults)
		modelGroup.Get("/pricing", r.GetModelPricing)
		modelGroup.Get("/apimart_key", r.getApimartKey)
		modelGroup.Put("/apimart_key", r.setApimartKey)
		modelGroup.Get("/:id", r.GetModelByID)
		modelGroup.Put("/:id", r.UpdateModel)
		modelGroup.Delete("/:id", r.DeleteModel)
		modelGroup.Put("/:id/status", r.UpdateModelStatus)
		modelGroup.Post("/:id/connect_test", r.TestModelConnectivity)
		modelGroup.Put("/:id/set_default", r.SetDefaultModel)
	}

	aieoGenerateGroup := apiV1Group.Group("/aieo_generate")
	{
		aieoGenerateGroup.Post("/", r.CreateAIEOGenerate)                           // 创建任务
		aieoGenerateGroup.Get("/stats", r.GetMatrixStats)                           // 获取统计信息（放在 :id 前面避免冲突）
		aieoGenerateGroup.Put("/:id/content", r.UpdateAIEOGenerateContent)          // 更新创作内容
		aieoGenerateGroup.Put("/:id/status", r.CancelAIEOGenerate)                  // 更新状态（取消）
		aieoGenerateGroup.Delete("/:id", r.DeleteAIEOGenerate)                      // 删除任务
		aieoGenerateGroup.Get("/:id", r.GetAIEOGenerateByID)                        // 获取详情
		aieoGenerateGroup.Get("/", r.GetAIEOGeneratesWithPage)                      // 获取列表
		aieoGenerateGroup.Post("/generate_user_questions", r.GenerateUserQuestions) // 生成用户问题
		aieoGenerateGroup.Post("/:id/start_send", r.StartSend)                      // 开始发送任务
		aieoGenerateGroup.Put("/:id/report_send_info", r.ReportSendInfo)            // 上报发送信息
		aieoGenerateGroup.Post("/get_send_job", r.GetSendJob)                       // 获取发送任务
	}

	videoJobGroup := apiV1Group.Group("/video_job")
	{
		videoJobGroup.Post("/", r.CreateVideoJob)
		videoJobGroup.Get("/", r.GetVideoJobsWithPage)
		videoJobGroup.Get("/:id", r.GetVideoJobByID)
		videoJobGroup.Put("/:id/cancel", r.CancelVideoJob) // 取消任务
		videoJobGroup.Put("/:id/status", r.UpdateVideoJobSendStatus)
	}

	copywritingGroup := apiV1Group.Group("/copywriting")
	{
		// 会话管理
		copywritingGroup.Post("/session", r.createCopywritingSession)
		copywritingGroup.Get("/session", r.getCopywritingSessions)
		copywritingGroup.Get("/session/:id", r.getCopywritingSession)
		copywritingGroup.Delete("/session/:id", r.deleteCopywritingSession)
		copywritingGroup.Post("/session/:id/chat", r.copywritingChatStream)
		copywritingGroup.Get("/session/:id/files", r.getCopywritingFilesBySession)

		// 文件管理
		copywritingGroup.Get("/files", r.getCopywritingFiles)
		copywritingGroup.Get("/file/:id", r.getCopywritingFile)
		copywritingGroup.Put("/file/:id", r.updateCopywritingFile)
		copywritingGroup.Delete("/file/:id", r.deleteCopywritingFile)
		copywritingGroup.Post("/file/:id/recover", r.recoverCopywritingFile)
		copywritingGroup.Get("/file/:id/download", r.downloadCopywritingFile)

		// Skills
		copywritingGroup.Get("/skills", r.getCopywritingSkills)
	}
}
