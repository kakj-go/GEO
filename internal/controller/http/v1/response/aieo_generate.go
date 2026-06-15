package response

import (
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/markdown"
)

type AIEOGenerateDetailResponse struct {
	ID                  int64                            `json:"id"`
	CompanyID           int64                            `json:"company_id"`
	UserID              int64                            `json:"user_id"`
	Name                string                           `json:"name"`                  // 任务名称
	Keyword             string                           `json:"keyword"`               // 关键词
	TargetWord          string                           `json:"target_word"`           // 目标词
	UserQuestions       []string                         `json:"user_questions"`        // 用户问题列表
	Type                string                           `json:"type"`                  // 任务类型 图文创作=Image, 文章创作=Article
	ImageLibraryList    []*request.AssetsLibraryResponse `json:"image_library_list"`    // 引用图片库ID列表
	MaterialLibraryList []*entity.MaterialLibrary        `json:"material_library_list"` // 引用素材库ID列表
	Contents            entity.AIEOGenerateContents      `json:"contents"`              // 创作内容列表
	Platform            string                           `json:"platform"`              // 目标平台

	Status string `json:"status"` // 状态 Running 蒸馏中, Cancel 取消, Success 蒸馏成功, Failed 蒸馏失败
	// 收录状态 NotSent 未收录, Sending 收录中, Sent 已收录, Failed 收录失败, Cancel 已取消
	SendStatus string           `json:"send_status"`
	SendInfos  entity.SendInfos `json:"send_infos"` // 收录信息列表

	ErrorInfo string `json:"error_info"` // 错误信息

	CreatedAt int64 `json:"created_at"` // 创建时间（时间戳）
	UpdatedAt int64 `json:"updated_at"` // 更新时间（时间戳）
}

type SenJobInfo struct {
	ID               int64              `json:"id"`                 // 任务ID
	Name             string             `json:"name"`               // 任务名称
	Type             string             `json:"type"`               // 任务类型 图文创作=Image, 文章创作=Article
	ImageUrl         []string           `json:"image_url"`          // 图片URL列表
	SendJobMarkdowns []*SendJobMarkdown `json:"send_job_markdowns"` // 发送任务Markdown列表
	SendUserInfos    []*entity.SendInfo `json:"send_user_infos"`    // 收录信息列表
}

type SendJobMarkdown struct {
	Title      string               `json:"title"`      // 任务标题
	Operations []markdown.Operation `json:"operations"` // 操作序列
}

type SendJobResponse struct {
	SendJobInfos []*SenJobInfo `json:"send_job_infos"` // 发送任务信息列表
}

type MatrixStats struct {
	Total   int64   `json:"total"`
	Success int64   `json:"success"`
	Pending int64   `json:"pending"`
	Rate    float64 `json:"rate"`
}

type MatrixStatsResponse struct {
	TotalTasks   int64       `json:"total_tasks"`
	TotalSuccess int64       `json:"total_success"`
	TotalRate    float64     `json:"total_rate"`
	ImageStats   MatrixStats `json:"image_stats"`
	VideoStats   MatrixStats `json:"video_stats"`
}
