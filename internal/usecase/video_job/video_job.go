package video_job

import (
	"context"
	"fmt"

	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
	"go.uber.org/zap"
)

// UseCase 视频任务用例

type UseCase struct {
	repo                    repo.VideoJobRepo
	websiteLoginContextRepo repo.WebsiteLoginContextRepo
	assetsLibraryRepo       repo.AssetsLibraryRepo
	logger                  *logger.Logger
}

// New 创建新的视频任务用例实例
func New(repo repo.VideoJobRepo, websiteLoginContextRepo repo.WebsiteLoginContextRepo, assetsLibraryRepo repo.AssetsLibraryRepo, logger *logger.Logger) *UseCase {
	return &UseCase{
		repo:                    repo,
		websiteLoginContextRepo: websiteLoginContextRepo,
		assetsLibraryRepo:       assetsLibraryRepo,
		logger:                  logger,
	}
}

// CreateVideoJob 创建视频任务
func (uc *UseCase) CreateVideoJob(ctx context.Context, videoJob *entity.VideoJob) error {
	// 获取用户ID和公司ID
	userID := ctx.Value(constants.UserID).(int64)
	companyID := ctx.Value(constants.CompanyID).(int64)

	// 查询所有需要收录的网站登录上下文ID
	var websiteLoginContextIDs []int64
	for _, sendInfo := range videoJob.SendInfos {
		websiteLoginContextIDs = append(websiteLoginContextIDs, sendInfo.WebsiteLoginContextID)
	}
	contexts, _, err := uc.websiteLoginContextRepo.GetWebsiteLoginContextsWithPage(ctx, companyID, "", "", "", nil, websiteLoginContextIDs, 1, len(websiteLoginContextIDs))
	if err != nil {
		uc.logger.Error("repo.StartSend - uc.websiteLoginContextRepo.GetWebsiteLoginContextsWithPage", zap.Error(err))
		return err
	}
	var sendInfo entity.VideoSendInfos
	for _, context := range contexts {
		// 检查发布限制
		if context.DailyLimit > 0 && context.TodayCount >= context.DailyLimit {
			return fmt.Errorf("账号 %s 今日发送次数 (%d/%d) 已达上限", context.Username, context.TodayCount, context.DailyLimit)
		}

		sendInfo = append(sendInfo, &entity.VideoSendInfo{
			WebsiteLoginContextID: context.ID,
			Platform:              context.Platform,
			Username:              context.Username,
			Avatar:                context.Avatar,
			Status:                "Waiting",
			Message:               "",
		})
	}

	asset, err := uc.assetsLibraryRepo.GetAssetsLibraryByID(ctx, videoJob.AssetsID)
	if err != nil {
		uc.logger.Error("repo.StartSend - uc.assetsLibraryRepo.GetAssetsLibraryByID", zap.Error(err))
		return err
	}

	videoJob.Title = asset.Title
	videoJob.Description = asset.Description
	videoJob.UserID = userID
	videoJob.CompanyID = companyID
	videoJob.SendStatus = "Sending" // 默认状态为待收录
	videoJob.SendInfos = sendInfo

	// 创建视频任务
	err = uc.repo.CreateVideoJob(ctx, videoJob)
	if err != nil {
		return fmt.Errorf("VideoJob - CreateVideoJob - uc.repo.CreateVideoJob: %w", err)
	}

	return nil
}

// GetVideoJobByID 根据ID获取视频任务
func (uc *UseCase) GetVideoJobByID(ctx context.Context, id int64) (*entity.VideoJob, error) {
	// 获取公司ID
	companyID := ctx.Value(constants.CompanyID).(int64)

	// 获取视频任务
	videoJob, err := uc.repo.GetVideoJobByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("VideoJob - GetVideoJobByID - uc.repo.GetVideoJobByID: %w", err)
	}

	// 验证权限（只能查看自己公司的任务）
	if videoJob == nil || videoJob.CompanyID != companyID {
		return nil, fmt.Errorf("VideoJob - GetVideoJobByID - video job not found or permission denied")
	}

	return videoJob, nil
}

// UpdateVideoJobSendStatus 更新视频任务收录状态
func (uc *UseCase) UpdateVideoJobSendStatus(ctx context.Context, id int64, status string, message string, recordID int64) error {
	// 验证权限
	videoJob, err := uc.repo.GetVideoJobByID(ctx, id)
	if err != nil {
		return fmt.Errorf("VideoJob - UpdateVideoJobSendStatus - uc.repo.GetVideoJobByID: %w", err)
	}

	if videoJob.SendStatus != "Sending" {
		return fmt.Errorf("任务不是发送中状态")
	}

	for _, sendInfo := range videoJob.SendInfos {
		if sendInfo.WebsiteLoginContextID == recordID {
			sendInfo.Status = status
			sendInfo.Message = message
			if status == "Success" {
				_ = uc.websiteLoginContextRepo.IncrementTodayCount(ctx, recordID)
			}
		}
	}

	allDone := true
	lastStatus := "Success"
	lastMessage := ""
	for _, sendInfo := range videoJob.SendInfos {
		if sendInfo.Status == "Waiting" {
			allDone = false
		}
		if sendInfo.Status == "Failed" {
			lastStatus = "Failed"
			lastMessage = sendInfo.Message
		}
	}

	if !allDone {
		lastStatus = "Sending"
		lastMessage = ""
	}

	// 更新收录状态
	err = uc.repo.UpdateVideoJobSendStatus(ctx, id, lastStatus, lastMessage, videoJob.SendInfos)
	if err != nil {
		return fmt.Errorf("VideoJob - UpdateVideoJobSendStatus - uc.repo.UpdateVideoJobSendStatus: %w", err)
	}

	return nil
}

// GetVideoJobsWithPage 分页查询视频任务列表
func (uc *UseCase) GetVideoJobsWithPage(ctx context.Context, title string, sendStatus string, assetsID int64, page, pageSize int) (*response.VideoJobList, error) {
	// 获取公司ID
	companyID := ctx.Value(constants.CompanyID).(int64)
	userID := ctx.Value(constants.UserID).(int64)

	// 查询列表
	videoJobs, total, err := uc.repo.GetVideoJobsWithPage(ctx, companyID, title, sendStatus, assetsID, uint64(page), uint64(pageSize))
	if err != nil {
		return nil, fmt.Errorf("VideoJob - GetVideoJobsWithPage - uc.repo.GetVideoJobsWithPage: %w", err)
	}

	var assetIDs []int64
	var assetsMap = map[int64]*entity.AssetsLibrary{}
	for _, videoJob := range videoJobs {
		assetIDs = append(assetIDs, videoJob.AssetsID)
	}
	if len(assetIDs) > 0 {
		imageLibraries, _, err := uc.assetsLibraryRepo.GetAssetsLibrariesWithPage(ctx, companyID, nil, "", nil, userID, "video", assetIDs, 1, len(assetIDs))
		if err != nil {
			return nil, fmt.Errorf("AIEOGenerate - GetAIEOGenerateByID - uc.imageLibraryRepo.GetAssetsLibrariesWithPage: %w", err)
		}
		for _, v := range imageLibraries {
			assetsMap[v.ID] = v
		}
	}

	var list []*response.VideoJob
	for _, videoJob := range videoJobs {
		job := &response.VideoJob{
			ID: videoJob.ID,

			Title:       videoJob.Title,
			Description: videoJob.Description,
			AssetsID:    videoJob.AssetsID,

			SendStatus: videoJob.SendStatus,
			SendInfos:  videoJob.SendInfos,
			ErrorInfo:  videoJob.ErrorInfo,

			CreatedAt: videoJob.CreatedAt,
			UpdatedAt: videoJob.UpdatedAt,
		}
		assets := assetsMap[videoJob.AssetsID]
		if assets != nil {
			job.VideoURL = fmt.Sprintf("%s/%s/%s", config.GetConfig().App.Host, "assets", assets.Path)
		}
		list = append(list, job)
	}

	return &response.VideoJobList{
		VideoJobs: list,
		Total:     int64(total),
	}, nil
}

// CancelVideoJob 取消视频任务
func (uc *UseCase) CancelVideoJob(ctx context.Context, id int64) error {
	// 获取公司ID
	companyID := ctx.Value(constants.CompanyID).(int64)

	// 验证权限
	videoJob, err := uc.repo.GetVideoJobByID(ctx, id)
	if err != nil {
		return fmt.Errorf("VideoJob - CancelVideoJob - uc.repo.GetVideoJobByID: %w", err)
	}

	if videoJob == nil || videoJob.CompanyID != companyID {
		return fmt.Errorf("VideoJob - CancelVideoJob - video job not found or permission denied")
	}

	if videoJob.SendStatus == "Sending" {
		// 更新所有等待状态的发送信息
		for _, sendInfo := range videoJob.SendInfos {
			sendInfo.Status = "Cancel"
			sendInfo.Message = "用户取消"
		}
		// 更新发送状态
		err = uc.repo.UpdateVideoJobSendStatus(ctx, id, "Cancel", "用户取消", videoJob.SendInfos)
		if err != nil {
			return fmt.Errorf("VideoJob - CancelVideoJob - uc.repo.UpdateVideoJobSendStatus: %w", err)
		}
	}

	return nil
}
