package response

import "github.com/kakj-go/llm_reference_matrix/internal/entity"

type VideoJob struct {
	ID        int64 `json:"id"`
	CompanyID int64 `json:"company_id"`
	UserID    int64 `json:"user_id"`

	Title       string `json:"title"`
	Description string `json:"description"`
	AssetsID    int64  `json:"assets_id"`
	VideoURL    string `json:"video_url"`

	// 收录状态 Sending 待收录, Success 已收录, Failed 收录失败, Cancel 已取消
	SendStatus string                `json:"send_status"`
	SendInfos  entity.VideoSendInfos `json:"send_infos"` // 收录信息列表

	ErrorInfo string `json:"error_info"` // 错误信息

	CreatedAt int64 `json:"created_at"` // 创建时间（时间戳）
	UpdatedAt int64 `json:"updated_at"` // 更新时间（时间戳）
}

type VideoJobList struct {
	VideoJobs []*VideoJob `json:"video_jobs"`
	Total     int64       `json:"total"`
}
