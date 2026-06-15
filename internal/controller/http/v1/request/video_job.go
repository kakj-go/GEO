package request

import (
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

// CreateVideoJob 创建视频任务请求
type CreateVideoJob struct {
	AssetsID               int64   `json:"assets_id" validate:"required"`
	WebsiteLoginContextIDs []int64 `json:"website_login_context_ids" validate:"required"`
}

// ToEntity 转换为实体
func (r *CreateVideoJob) ToEntity() *entity.VideoJob {
	e := &entity.VideoJob{
		AssetsID:   r.AssetsID,
		SendStatus: "Sending", // 默认状态为待收录
		SendInfos:  entity.VideoSendInfos{},
	}
	for _, websiteLoginContextID := range r.WebsiteLoginContextIDs {
		e.SendInfos = append(e.SendInfos, &entity.VideoSendInfo{
			WebsiteLoginContextID: websiteLoginContextID,
			Platform:              "",
			Username:              "",
			Avatar:                "",
			Status:                "",
			Message:               "",
		})
	}
	return e
}

// UpdateVideoJobSendStatus 更新视频任务收录状态请求
type UpdateVideoJobSendStatus struct {
	Status   string `json:"status" validate:"required"`
	Message  string `json:"message"`
	RecordID int64  `json:"record_id" validate:"required"`
}

// GetVideoJobsRequest 分页查询视频任务列表请求
type GetVideoJobsRequest struct {
	Title      string `query:"title"`
	SendStatus string `query:"send_status"`
	AssetsID   int64  `query:"assets_id"`
	Page       int    `query:"page" validate:"min=1"`
	PageSize   int    `query:"page_size" validate:"min=1"`
}
