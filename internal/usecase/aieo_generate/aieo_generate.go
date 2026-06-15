package aieo_generate

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/internal/usecase"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
	"github.com/kakj-go/llm_reference_matrix/pkg/llm"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
	"github.com/kakj-go/llm_reference_matrix/pkg/markdown"
	"go.uber.org/zap"
)

// AIEOGenerate 实现 AIEOGenerate 用例接口
type AIEOGenerate struct {
	repo                    repo.AIEOGenerateRepo
	modelRepo               repo.ModelRepo
	assetsLibraryRepo       repo.AssetsLibraryRepo
	materialLibraryRepo     repo.MaterialLibraryRepo
	websiteLoginContextRepo repo.WebsiteLoginContextRepo
	videoJobRepo            repo.VideoJobRepo
	companyRepo             repo.CompanyRepo
	billingCase             usecase.Billing
	logger                  *logger.Logger
}

// New 创建新的 AIEOGenerate 用例实例
func New(repo repo.AIEOGenerateRepo,
	modelRepo repo.ModelRepo,
	assetsLibraryRepo repo.AssetsLibraryRepo,
	materialLibraryRepo repo.MaterialLibraryRepo,
	websiteLoginContextRepo repo.WebsiteLoginContextRepo,
	videoJobRepo repo.VideoJobRepo,
	companyRepo repo.CompanyRepo,
	billingCase usecase.Billing,
	logger *logger.Logger) usecase.AIEOGenerate {
	u := &AIEOGenerate{repo: repo, modelRepo: modelRepo, assetsLibraryRepo: assetsLibraryRepo, materialLibraryRepo: materialLibraryRepo, websiteLoginContextRepo: websiteLoginContextRepo, videoJobRepo: videoJobRepo, companyRepo: companyRepo, billingCase: billingCase, logger: logger}
	values, _, err := repo.GetAIEOGeneratesWithPage(context.Background(), 0, "", "", "Running", "", false, 1, 100)
	if err != nil {
		logger.Error("GetAIEOGeneratesWithPage", zap.Error(err))
	} else {
		for _, value := range values {
			go u.generateContents(value.ID)
		}
	}
	return u
}

func (uc *AIEOGenerate) CreateAIEOGenerate(ctx context.Context, generate *entity.AIEOGenerate) error {
	// 获取用户ID和公司ID
	userID := ctx.Value(constants.UserID).(int64)
	companyID := ctx.Value(constants.CompanyID).(int64)

	// 强制任务类型为文章
	generate.Type = "Article"
	generate.UserID = userID
	generate.CompanyID = companyID
	generate.Status = "Running" // 默认状态为蒸馏中
	generate.SendStatus = "NotSent"
	generate.Contents = nil

	if generate.Platform == "" {
		return fmt.Errorf("AIEOGenerate - CreateAIEOGenerate - platform is required")
	}

	// Check balance if we have a default model
	model, err := uc.modelRepo.GetDefaultModel(ctx, companyID, "llm")
	if err == nil && model != nil {
		if err := uc.billingCase.CheckBalance(ctx, companyID, model.ModelName); err != nil {
			return err
		}
	}

	// 创建AIEO生成任务
	err = uc.repo.CreateAIEOGenerate(ctx, generate)
	if err != nil {
		return fmt.Errorf("AIEOGenerate - CreateAIEOGenerate - uc.repo.CreateAIEOGenerate: %w", err)
	}

	go uc.generateContents(generate.ID)
	return nil
}

// GetAIEOGenerateByID 根据ID获取AIEO生成任务（包含创作内容）
func (uc *AIEOGenerate) GetAIEOGenerateByID(ctx context.Context, id int64) (*response.AIEOGenerateDetailResponse, error) {
	// 获取公司ID
	companyID := ctx.Value(constants.CompanyID).(int64)

	// 获取AIEO生成任务
	generate, err := uc.repo.GetAIEOGenerateByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("AIEOGenerate - GetAIEOGenerateByID - uc.repo.GetAIEOGenerateByID: %w", err)
	}

	// 验证权限（只能查看自己公司的任务）
	if generate == nil || generate.CompanyID != companyID {
		return nil, fmt.Errorf("AIEOGenerate - GetAIEOGenerateByID - generate not found or permission denied")
	}

	// 转换为响应结构体
	resp := &response.AIEOGenerateDetailResponse{
		ID:            generate.ID,
		CompanyID:     generate.CompanyID,
		UserID:        generate.UserID,
		Name:          generate.Name,
		Keyword:       generate.Keyword,
		TargetWord:    generate.TargetWord,
		UserQuestions: generate.UserQuestions,
		Type:          generate.Type,
		Platform:      generate.Platform,
		Contents:      generate.Contents,
		Status:        generate.Status,
		SendStatus:    generate.SendStatus,
		SendInfos:     generate.SendInfos,
		ErrorInfo:     generate.ErrorInfo,
		CreatedAt:     generate.CreatedAt,
		UpdatedAt:     generate.UpdatedAt,
	}

	// 获取图片库列表
	if len(generate.ImageLibraryIDList) > 0 {
		imageLibraries, _, err := uc.assetsLibraryRepo.GetAssetsLibrariesWithPage(ctx, companyID, nil, "", nil, generate.UserID, "image", generate.ImageLibraryIDList, 1, len(generate.ImageLibraryIDList))
		if err != nil {
			return nil, fmt.Errorf("AIEOGenerate - GetAIEOGenerateByID - uc.imageLibraryRepo.GetAssetsLibrariesWithPage: %w", err)
		}
		for _, v := range imageLibraries {
			resp.ImageLibraryList = append(resp.ImageLibraryList, request.ToAssetsLibraryResponse(v))
		}
	}

	// 获取素材库列表
	if len(generate.MaterialLibraryIDList) > 0 {
		materialLibraries, _, err := uc.materialLibraryRepo.GetMaterialLibrariesWithPage(ctx, companyID, nil, "", generate.UserID, 1, len(generate.MaterialLibraryIDList), generate.MaterialLibraryIDList)
		if err != nil {
			return nil, fmt.Errorf("AIEOGenerate - GetAIEOGenerateByID - uc.materialLibraryRepo.GetMaterialLibrariesWithPage: %w", err)
		}
		resp.MaterialLibraryList = materialLibraries
	}

	return resp, nil
}

// UpdateAIEOGenerateContent 更新AIEO生成任务的创作内容
func (uc *AIEOGenerate) UpdateAIEOGenerateContent(ctx context.Context, id int64, contents entity.AIEOGenerateContents) error {
	// 获取公司ID
	companyID := ctx.Value(constants.CompanyID).(int64)

	// 验证权限
	generate, err := uc.repo.GetAIEOGenerateByID(ctx, id)
	if err != nil {
		return fmt.Errorf("AIEOGenerate - UpdateAIEOGenerateContent - uc.repo.GetAIEOGenerateByID: %w", err)
	}

	if generate == nil || generate.CompanyID != companyID {
		return fmt.Errorf("AIEOGenerate - UpdateAIEOGenerateContent - generate not found or permission denied")
	}

	for _, content := range contents {
		_, err := markdown.ParseMarkdownToOperations(content.Content)

		if err != nil {
			return fmt.Errorf("AIEOGenerate - UpdateAIEOGenerateContent - markdown.ParseMarkdownToOperations: %w", err)
		}
	}

	// 更新创作内容
	err = uc.repo.UpdateAIEOGenerateContent(ctx, id, contents)
	if err != nil {
		return fmt.Errorf("AIEOGenerate - UpdateAIEOGenerateContent - uc.repo.UpdateAIEOGenerateContent: %w", err)
	}

	return nil
}

// UpdateAIEOGenerateStatus 更新AIEO生成任务状态（用于取消蒸馏）
func (uc *AIEOGenerate) UpdateAIEOGenerateStatus(ctx context.Context, id int64, status string) error {
	// 获取公司ID
	companyID := ctx.Value(constants.CompanyID).(int64)

	// 验证权限
	generate, err := uc.repo.GetAIEOGenerateByID(ctx, id)
	if err != nil {
		return fmt.Errorf("AIEOGenerate - UpdateAIEOGenerateStatus - uc.repo.GetAIEOGenerateByID: %w", err)
	}

	if generate == nil || generate.CompanyID != companyID {
		return fmt.Errorf("AIEOGenerate - UpdateAIEOGenerateStatus - generate not found or permission denied")
	}

	if status == "Cancel" && generate.SendStatus == "Sending" {
		for _, sendInfo := range generate.SendInfos {
			for _, status := range sendInfo.SendStatus {
				if status.Status == "Waiting" {
					status.Status = "Cancel"
					status.Message = "用户取消"
				}
			}
		}
		// 更新发送状态
		err = uc.repo.UpdateAIEOGenerateSends(ctx, id, "Cancel", "用户取消", generate.SendInfos)
		if err != nil {
			return fmt.Errorf("AIEOGenerate - UpdateAIEOGenerateStatus - uc.repo.UpdateAIEOGenerateSends: %w", err)
		}
	} else {
		// 更新状态
		err = uc.repo.UpdateAIEOGenerateStatus(ctx, id, status, "")
		if err != nil {
			return fmt.Errorf("AIEOGenerate - UpdateAIEOGenerateStatus - uc.repo.UpdateAIEOGenerateStatus: %w", err)
		}
	}

	return nil
}

// DeleteAIEOGenerate 删除AIEO生成任务
func (uc *AIEOGenerate) DeleteAIEOGenerate(ctx context.Context, id int64) error {
	// 获取公司ID
	companyID := ctx.Value(constants.CompanyID).(int64)

	// 验证权限
	generate, err := uc.repo.GetAIEOGenerateByID(ctx, id)
	if err != nil {
		return fmt.Errorf("AIEOGenerate - DeleteAIEOGenerate - uc.repo.GetAIEOGenerateByID: %w", err)
	}

	if generate == nil || generate.CompanyID != companyID {
		return fmt.Errorf("AIEOGenerate - DeleteAIEOGenerate - generate not found or permission denied")
	}

	// 删除任务
	err = uc.repo.DeleteAIEOGenerate(ctx, id)
	if err != nil {
		return fmt.Errorf("AIEOGenerate - DeleteAIEOGenerate - uc.repo.DeleteAIEOGenerate: %w", err)
	}

	return nil
}

// GetAIEOGeneratesWithPage 分页查询AIEO生成任务列表，不返回创作内容
func (uc *AIEOGenerate) GetAIEOGeneratesWithPage(ctx context.Context, name, keyword string, page, pageSize uint64) (*entity.AIEOGenerateList, error) {
	// 获取公司ID
	companyID := ctx.Value(constants.CompanyID).(int64)

	// 查询列表
	generates, total, err := uc.repo.GetAIEOGeneratesWithPage(ctx, companyID, name, keyword, "", "", false, page, pageSize)
	if err != nil {
		return nil, fmt.Errorf("AIEOGenerate - GetAIEOGeneratesWithPage - uc.repo.GetAIEOGeneratesWithPage: %w", err)
	}

	return &entity.AIEOGenerateList{
		AIEOGenerates: generates,
		Total:         total,
	}, nil
}

// GenerateAIEOUserQuestion generate aieo user question
func (uc *AIEOGenerate) GenerateAIEOUserQuestion(ctx context.Context, keyword, targetWord string, historyQuestions []string) (userQuestions []string, err error) {
	companyID := ctx.Value(constants.CompanyID).(int64)
	userID := ctx.Value(constants.UserID).(int64)

	model, err := uc.modelRepo.GetDefaultModel(ctx, companyID, "llm")
	if err != nil {
		return nil, fmt.Errorf("modelRepo.GetDefaultModel - uc.modelRepo.GetDefaultModel: %v", err)
	}

	// 检查余额
	if err := uc.billingCase.CheckBalance(ctx, companyID, model.ModelName); err != nil {
		return nil, err
	}

	historyQuestionsJSON, err := json.Marshal(historyQuestions)
	if err != nil {
		return nil, fmt.Errorf("json.Marshal - historyQuestionsJSON: %w", err)
	}

	generateUserQuestionPrompt := config.GetConfig().AIEO.UserQuestionPrompt
	prompt := fmt.Sprintf(generateUserQuestionPrompt, keyword, targetWord, string(historyQuestionsJSON))

	modelInfo := &llm.ModelInfo{
		ApiEndpointHost: model.ApiEndpointHost,
		EndpointID:      model.EndpointID,
		ModelName:       model.ModelName,
		BaseModel:       model.BaseModel,
		ApiKey:          model.Credential.ApiKey,
		MaxToken:        model.ContextLength,
		Temperature:     0,
	}

	startGen := time.Now()
	resp, usage, err := llm.Chat(ctx, modelInfo, prompt, "")
	durationMs := time.Since(startGen).Milliseconds()

	if err != nil {
		// 即使失败，如果有消耗也进行扣费（记录）
		if usage != nil {
			_, _ = uc.billingCase.DeductPoints(ctx, companyID, userID, 0, modelInfo.ModelName, usage.PromptTokens, usage.CompletionTokens, durationMs, err.Error(), "生成用户问题失败")
		}
		return nil, fmt.Errorf("llm.Chat - uc.llm.Chat: %w", err)
	}

	// 扣费
	if usage != nil {
		_, _ = uc.billingCase.DeductPoints(ctx, companyID, userID, 0, modelInfo.ModelName, usage.PromptTokens, usage.CompletionTokens, durationMs, "stop", "生成用户问题")
	}

	// 提取 JSON 数组部分，防止模型返回多余文字
	cleanedResp := extractJSONArray(resp)

	err = json.Unmarshal([]byte(cleanedResp), &userQuestions)
	if err != nil {
		return nil, fmt.Errorf("json.Unmarshal: %w, original resp: %s", err, resp)
	}
	return userQuestions, nil
}

func extractJSONArray(s string) string {
	start := strings.Index(s, "[")
	end := strings.LastIndex(s, "]")
	if start == -1 || end == -1 || start >= end {
		return s
	}
	return s[start : end+1]
}

func (uc *AIEOGenerate) generateContents(id int64) {
	generate, err := uc.repo.GetAIEOGenerateByID(context.Background(), id)
	if err != nil {
		uc.logger.Error("repo.GetAIEOGenerate - uc.repo.GetAIEOGenerateByID", zap.Error(err))
		return
	}

	var images []*entity.AssetsLibrary
	if len(generate.ImageLibraryIDList) > 0 {
		images, _, err = uc.assetsLibraryRepo.GetAssetsLibrariesWithPage(context.Background(), generate.CompanyID, nil, "", nil, generate.UserID,
			"image", generate.ImageLibraryIDList, 1, len(generate.ImageLibraryIDList))
		if err != nil {
			generate.Status = "Failed"
			generate.ErrorInfo = fmt.Sprintf("图片库查询失败: %s", err.Error())
			err = uc.repo.UpdateAIEOGenerateStatus(context.Background(), id, generate.Status, generate.ErrorInfo)
			if err != nil {
				uc.logger.Error("repo.UpdateAIEOGenerateStatus - uc.repo.UpdateAIEOGenerateStatus", zap.Error(err))
			}
		}
	}

	var materials []*entity.MaterialLibrary
	if len(generate.MaterialLibraryIDList) > 0 {
		materials, _, err = uc.materialLibraryRepo.GetMaterialLibrariesWithPage(context.Background(), generate.CompanyID, nil, "", generate.UserID,
			1, len(generate.MaterialLibraryIDList), generate.MaterialLibraryIDList)
		if err != nil {
			generate.Status = "Failed"
			generate.ErrorInfo = fmt.Sprintf("素材库查询失败: %s", err.Error())
			err = uc.repo.UpdateAIEOGenerateStatus(context.Background(), id, generate.Status, generate.ErrorInfo)
			if err != nil {
				uc.logger.Error("repo.UpdateAIEOGenerateStatus - uc.repo.UpdateAIEOGenerateStatus", zap.Error(err))
			}
			return
		}
	}

	company, err := uc.companyRepo.GetCompanyByID(context.Background(), generate.CompanyID)
	if err != nil {
		uc.logger.Error("companyRepo.GetCompanyByID", zap.Error(err))
		// Continue with empty company info if not found
		company = &entity.Company{}
	}

	model, err := uc.modelRepo.GetDefaultModel(context.Background(), generate.CompanyID, "llm")
	if err != nil {
		generate.Status = "Failed"
		generate.ErrorInfo = fmt.Sprintf("默认模型查询失败: %s", err.Error())
		err = uc.repo.UpdateAIEOGenerateStatus(context.Background(), id, generate.Status, generate.ErrorInfo)
		if err != nil {
			uc.logger.Error("repo.UpdateAIEOGenerateStatus - uc.repo.UpdateAIEOGenerateStatus", zap.Error(err))
		}
		return
	}

	// 加载合规文档
	complianceDoc := ""
	docPath := ""
	switch generate.Platform {
	case string(constants.ZhihuWebsitePlatform):
		docPath = "compliance_docs.md"
	case string(constants.JinRiTouTiaoWebsitePlatform), string(constants.BaiJiaHaoWebsitePlatform), string(constants.WeiXinWebsitePlatform), string(constants.BilibiliWebsitePlatform):
		docPath = "compliance_docs1.md"
	case string(constants.WangYiWebsitePlatform), string(constants.QiEWebsitePlatform), string(constants.SouHuHaoWebsitePlatform), string(constants.CSDNWebsitePlatform):
		docPath = "compliance_docs2.md"
	case string(constants.DouYinWebsitePlatform), string(constants.XiaoHongShuWebsitePlatform):
		docPath = "compliance_docs3.md"
	case string(constants.KuaiShouWebsitePlatform):
		docPath = "compliance_docs4.md"
	}

	if docPath != "" {
		content, err := uc.GetComplianceDoc(docPath)
		if err == nil {
			complianceDoc = content
			// 替换占位符
			complianceDoc = strings.ReplaceAll(complianceDoc, "{训练词占位符}", generate.TargetWord)
			complianceDoc = strings.ReplaceAll(complianceDoc, "【训练词占位符】", generate.TargetWord)
			complianceDoc = strings.ReplaceAll(complianceDoc, "{转化词占位符}", generate.Keyword)
			complianceDoc = strings.ReplaceAll(complianceDoc, "【转化词占位符】", generate.Keyword)
		}
	}

	imagePrompt := "无"
	if len(images) > 0 {
		imagePrompt = ""
		for index, image := range images {
			imagePrompt += fmt.Sprintf(`
#### image_%v
图片描述：%s
图片地址: %s
`, index+1, image.Description, fmt.Sprintf("%s/%s/%s", config.GetConfig().App.Host, "assets", image.Path))
		}
	}

	materialPrompt := ""
	for _, material := range materials {
		materialPrompt += fmt.Sprintf(`
#### %s
%s
`, material.Title, material.Content)
	}

	modelInfo := &llm.ModelInfo{
		ApiEndpointHost: model.ApiEndpointHost,
		EndpointID:      model.EndpointID,
		ModelName:       model.ModelName,
		BaseModel:       model.BaseModel,
		ApiKey:          model.Credential.ApiKey,
		MaxToken:        model.ContextLength,
		Temperature:     0,
	}

	var historySynopsis []string
	var contents entity.AIEOGenerateContents
	for num := int64(0); num < generate.CreateNum; num++ {
		generate, err := uc.repo.GetAIEOGenerateByID(context.Background(), id)
		if err != nil {
			uc.logger.Error("AIEOGenerate - generateContents - 获取默认模型失败: %v", zap.Error(err))
			return
		}
		if generate.Status == "Cancel" {
			return
		}

		userQuestions := strings.Join(generate.UserQuestions, ",")
		basePrompt := config.GetConfig().AIEO.ContentPrompt
		// 增强 Prompt - 使用字符串拼接避免 % 逸出问题
		enhancedPrompt := basePrompt + "\n\n" +
			"### 平台合规要求\n" + complianceDoc + "\n\n" +
			"### 公司品牌信息\n" +
			"- 品牌名称: " + company.BrandName + "\n" +
			"- 品牌定位: " + company.BrandPositioning + "\n" +
			"- 公司地区: " + company.Region + "\n" +
			"- 详细地址: " + company.AddressDetail + "\n\n" +
			"### 内容限制\n" +
			"1. 只能使用 # 和 ## 级别的标题。\n" +
			"2. 严禁使用 ### 或更低级别的标题。\n" +
			"3. 请在文章中自然融入公司品牌信息。\n" +
			"\n### ⚠️ 重要提醒\n" +
			"请严格遵守上方「平台合规要求」中规定的字数限制，生成的文章正文字数必须在要求的范围内，不可超出也不可过少。\n"

		prompt := fmt.Sprintf(enhancedPrompt,
			generate.TargetWord,
			userQuestions,
			imagePrompt,
			materialPrompt,
			strings.Join(historySynopsis, ","))

		startGen := time.Now()
		resp, usage, err := llm.Chat(context.Background(), modelInfo, prompt, "")
		durationMs := time.Since(startGen).Milliseconds()

		var contentResp struct {
			Content  string `json:"content"`
			Synopsis string `json:"synopsis"`
			Title    string `json:"title"`
		}

		err = json.Unmarshal([]byte(resp), &contentResp)
		if err != nil {
			// Billing with error if parsing fails
			if usage != nil {
				_, _ = uc.billingCase.DeductPoints(context.Background(), generate.CompanyID, generate.UserID, id, modelInfo.ModelName, usage.PromptTokens, usage.CompletionTokens, durationMs, fmt.Sprintf("解析内容失败: %v", err), "")
			}

			generate.Status = "Failed"
			generate.ErrorInfo = fmt.Sprintf("内容解析失败: %s", err.Error())
			err = uc.repo.UpdateAIEOGenerateStatus(context.Background(), id, generate.Status, generate.ErrorInfo)
			if err != nil {
				uc.logger.Error("repo.UpdateAIEOGenerateStatus - uc.repo.UpdateAIEOGenerateStatus", zap.Error(err))
			}
			return
		}

		// Billing with success
		if usage != nil {
			_, _ = uc.billingCase.DeductPoints(context.Background(), generate.CompanyID, generate.UserID, id, modelInfo.ModelName, usage.PromptTokens, usage.CompletionTokens, durationMs, "stop", "")
		}

		historySynopsis = append(historySynopsis, contentResp.Synopsis)
		contents = append(contents, entity.AIEOGenerateContent{
			Content: contentResp.Content,
			Title:   contentResp.Title,
		})
	}

	err = uc.repo.UpdateAIEOGenerateContent(context.Background(), id, contents)
	if err != nil {
		uc.logger.Error("repo.UpdateAIEOGenerateContent - uc.repo.UpdateAIEOGenerateContent", zap.Error(err))
	}
	err = uc.repo.UpdateAIEOGenerateStatus(context.Background(), id, "Success", "")
	if err != nil {
		uc.logger.Error("repo.UpdateAIEOGenerateStatus - uc.repo.UpdateAIEOGenerateStatus", zap.Error(err))
	}
}

func (uc *AIEOGenerate) StartSend(ctx context.Context, id int64, websiteLoginContextIDs []int64) error {
	generate, err := uc.repo.GetAIEOGenerateByID(ctx, id)
	if err != nil {
		uc.logger.Error("repo.StartSend - uc.repo.GetAIEOGenerateByID", zap.Error(err))
		return err
	}
	if generate.SendStatus == "Sending" || generate.Status == "Sent" {
		return fmt.Errorf("已收录或者收录中的任务不能重复发送")
	}

	// 检查发布限制
	for _, contextID := range websiteLoginContextIDs {
		c, err := uc.websiteLoginContextRepo.GetWebsiteLoginContextByID(ctx, contextID)
		if err == nil && c != nil {
			// 如果 c.TodayCount >= c.DailyLimit 则不允许发送
			if c.DailyLimit > 0 && c.TodayCount >= c.DailyLimit {
				return fmt.Errorf("账号 %s 今日发送次数 (%d/%d) 已达上限", c.Username, c.TodayCount, c.DailyLimit)
			}
		}
	}

	contexts, _, err := uc.websiteLoginContextRepo.GetWebsiteLoginContextsWithPage(ctx, generate.CompanyID, "", "", "", nil, websiteLoginContextIDs, 1, len(websiteLoginContextIDs))
	if err != nil {
		uc.logger.Error("repo.StartSend - uc.websiteLoginContextRepo.GetWebsiteLoginContextsWithPage", zap.Error(err))
		return err
	}

	var sendStatus []*entity.SendStatus
	for i := 0; i < len(generate.Contents); i++ {
		sendStatus = append(sendStatus, &entity.SendStatus{
			Status:  "Waiting",
			Message: "",
		})
	}

	var sendInfo entity.SendInfos
	for _, context := range contexts {
		sendInfo = append(sendInfo, &entity.SendInfo{
			WebsiteLoginContextID: context.ID,
			Platform:              context.Platform,
			Username:              context.Username,
			Avatar:                context.Avatar,
			SendStatus:            sendStatus,
		})
	}

	err = uc.repo.UpdateAIEOGenerateSends(ctx, id, "Sending", "", sendInfo)
	if err != nil {
		uc.logger.Error("repo.StartSend - uc.repo.UpdateAIEOGenerateSends", zap.Error(err))
		return err
	}
	return nil
}

func (uc *AIEOGenerate) ReportSendInfo(ctx context.Context, id int64, req request.ReportSendInfoRequest) error {
	generate, err := uc.repo.GetAIEOGenerateByID(ctx, id)
	if err != nil {
		uc.logger.Error("repo.ReportSendInfo - uc.repo.GetAIEOGenerateByID", zap.Error(err))
		return err
	}
	if generate.SendStatus != "Sending" {
		return fmt.Errorf("任务不是发送中状态")
	}

	allDone := true
	lastStatus := "Success"
	lastMessage := ""
	for _, sendInfo := range generate.SendInfos {
		if sendInfo.WebsiteLoginContextID == req.RecordID {
			status := sendInfo.SendStatus[req.MarkdownIndex]
			if status != nil {
				status.Status = req.Status
				status.Message = req.Message
				if req.Status == "Success" {
					_ = uc.websiteLoginContextRepo.IncrementTodayCount(ctx, req.RecordID)
				}
			}
		}
		for _, status := range sendInfo.SendStatus {
			if status.Status == "Waiting" {
				allDone = false
			}
			if status.Status == "Failed" {
				lastStatus = "Failed"
				lastMessage = status.Message
			}
		}
	}

	if !allDone {
		lastStatus = "Sending"
		lastMessage = ""
	}

	err = uc.repo.UpdateAIEOGenerateSends(ctx, id, lastStatus, lastMessage, generate.SendInfos)
	if err != nil {
		uc.logger.Error("repo.ReportSendInfo - uc.repo.UpdateAIEOGenerateSends", zap.Error(err))
		return err
	}
	return nil
}

func (uc *AIEOGenerate) GetSendJob(ctx context.Context) (*response.SendJobResponse, error) {
	companyID := ctx.Value(constants.CompanyID).(int64)

	generates, _, err := uc.repo.GetAIEOGeneratesWithPage(ctx, companyID, "", "", "", "Sending", true, 1, 10)
	if err != nil {
		uc.logger.Error("repo.GetSendJob - uc.repo.GetAIEOGeneratesWithPage", zap.Error(err))
		return nil, err
	}

	var sendJobInfos []*response.SenJobInfo
	for _, generate := range generates {
		info := &response.SenJobInfo{
			ID:            generate.ID,
			Name:          generate.Name,
			Type:          generate.Type,
			SendUserInfos: generate.SendInfos,
		}

		// 发送任务Markdown列表
		var sendJobMarkdowns []*response.SendJobMarkdown
		var imageUrls []string
		for _, content := range generate.Contents {
			operations, err := markdown.ParseMarkdownToOperations(content.Content)
			if err != nil {
				uc.logger.Error("repo.GetSendJob - markdown.ParseMarkdownToOperations", zap.Error(err))
				return nil, err
			}

			// 从 markdown 中解析图片元素获取其地址
			for _, op := range operations {
				if op.Type == "add_image" {
					imageUrls = append(imageUrls, op.Value)
				}
			}

			sendJobMarkdowns = append(sendJobMarkdowns, &response.SendJobMarkdown{
				Title:      content.Title,
				Operations: operations,
			})
		}
		info.ImageUrl = imageUrls
		info.SendJobMarkdowns = sendJobMarkdowns
		sendJobInfos = append(sendJobInfos, info)
	}

	return &response.SendJobResponse{
		SendJobInfos: sendJobInfos,
	}, nil
}

// GetMatrixStats 获取任务矩阵统计信息
func (uc *AIEOGenerate) GetMatrixStats(ctx context.Context) (*response.MatrixStatsResponse, error) {
	companyID := ctx.Value(constants.CompanyID).(int64)

	// AIEO (Image) Stats
	imgSending, err := uc.repo.CountAIEOGenerates(ctx, companyID, "Sending")
	if err != nil {
		return nil, err
	}
	imgSuccess, err := uc.repo.CountAIEOGenerates(ctx, companyID, "Success")
	if err != nil {
		return nil, err
	}
	imgFailed, err := uc.repo.CountAIEOGenerates(ctx, companyID, "Failed")
	if err != nil {
		return nil, err
	}
	imgCancel, err := uc.repo.CountAIEOGenerates(ctx, companyID, "Cancel")
	if err != nil {
		return nil, err
	}

	imgTotal := imgSending + imgSuccess + imgFailed + imgCancel
	imgPending := imgSending
	imgFinished := imgSuccess + imgFailed
	imgRate := 0.0
	if imgFinished > 0 {
		imgRate = float64(imgSuccess) / float64(imgFinished) * 100
	}

	// Video Stats
	vidSending, err := uc.videoJobRepo.CountVideoJobs(ctx, companyID, "Sending")
	if err != nil {
		return nil, err
	}
	vidSuccess, err := uc.videoJobRepo.CountVideoJobs(ctx, companyID, "Success")
	if err != nil {
		return nil, err
	}
	vidFailed, err := uc.videoJobRepo.CountVideoJobs(ctx, companyID, "Failed")
	if err != nil {
		return nil, err
	}
	vidCancel, err := uc.videoJobRepo.CountVideoJobs(ctx, companyID, "Cancel")
	if err != nil {
		return nil, err
	}

	vidTotal := vidSending + vidSuccess + vidFailed + vidCancel
	vidPending := vidSending
	vidFinished := vidSuccess + vidFailed
	vidRate := 0.0
	if vidFinished > 0 {
		vidRate = float64(vidSuccess) / float64(vidFinished) * 100
	}

	// Global Stats
	totalTasks := imgTotal + vidTotal
	totalSuccess := imgSuccess + vidSuccess
	totalFinished := imgFinished + vidFinished
	totalRate := 0.0
	if totalFinished > 0 {
		totalRate = float64(totalSuccess) / float64(totalFinished) * 100
	}

	return &response.MatrixStatsResponse{
		TotalTasks:   totalTasks,
		TotalSuccess: totalSuccess,
		TotalRate:    totalRate,
		ImageStats: response.MatrixStats{
			Total:   imgTotal,
			Success: imgSuccess,
			Pending: imgPending,
			Rate:    imgRate,
		},
		VideoStats: response.MatrixStats{
			Total:   vidTotal,
			Success: vidSuccess,
			Pending: vidPending,
			Rate:    vidRate,
		},
	}, nil
}
