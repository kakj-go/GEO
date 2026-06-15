package request

import (
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

// CreateAIEOGenerate 创建AIEO生成任务请求
type CreateAIEOGenerate struct {
	Name                  string   `json:"name" validate:"required"`
	Keyword               string   `json:"keyword" validate:"required"`
	TargetWord            string   `json:"target_word" validate:"required"`
	UserQuestions         []string `json:"user_questions" validate:"required"`
	ImageLibraryIDList    []int64  `json:"image_library_id_list,omitempty"`
	MaterialLibraryIDList []int64  `json:"material_library_id_list,omitempty"`
	CreateNum             int64    `json:"create_num" validate:"required,min=1,max=10"`
	Type                  string   `json:"type" validate:"required"`
	Platform              string   `json:"platform" validate:"required"`
}

// ToEntity 转换为实体
func (r *CreateAIEOGenerate) ToEntity() *entity.AIEOGenerate {
	generate := &entity.AIEOGenerate{
		Name:                  r.Name,
		Keyword:               r.Keyword,
		TargetWord:            r.TargetWord,
		UserQuestions:         entity.StringSlice(r.UserQuestions),
		ImageLibraryIDList:    entity.Int64Slice(r.ImageLibraryIDList),
		MaterialLibraryIDList: entity.Int64Slice(r.MaterialLibraryIDList),
		CreateNum:             r.CreateNum,
		SendInfos:             entity.SendInfos{},
		Type:                  r.Type,
		Platform:              r.Platform,
	}

	return generate
}

// UpdateAIEOGenerateContent 更新AIEO生成任务创作内容请求
type UpdateAIEOGenerateContent struct {
	Content entity.AIEOGenerateContents `json:"content" validate:"required"`
}

// UpdateAIEOGenerateStatus 更新AIEO生成任务状态请求
type UpdateAIEOGenerateStatus struct {
	Status string `json:"status" validate:"required"`
}

// GetAIEOGeneratesRequest 分页查询AIEO生成任务列表请求
type GetAIEOGeneratesRequest struct {
	Name     string `query:"name"`
	Keyword  string `query:"keyword"`
	Page     int    `query:"page" validate:"min=1"`
	PageSize int    `query:"page_size" validate:"min=1,max=100"`
}

type GenerateUserQuestionsRequest struct {
	TargetWord       string   `json:"target_word" validate:"required"`
	Keyword          string   `json:"keyword" validate:"required"`
	HistoryQuestions []string `json:"history_questions,omitempty"`
}

type ReportSendInfoRequest struct {
	Status        string `json:"status" validate:"required"`
	Message       string `json:"message"`
	RecordID      int64  `json:"record_id" validate:"required"`
	MarkdownIndex int    `json:"markdown_index"`
}

type SendRequest struct {
	WebsiteLoginContextIDs []int64 `json:"website_login_context_ids" validate:"required"`
}
