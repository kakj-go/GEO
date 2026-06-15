package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

type AIEOGenerateContent struct {
	Content string `json:"content"` // 创作内容
	Title   string `json:"title"`   // 创作标题
}

type AIEOGenerateContents []AIEOGenerateContent

func (i *AIEOGenerateContents) Scan(value interface{}) error {
	if value == nil {
		*i = AIEOGenerateContents{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("unsupported type: %T", value)
	}
	return json.Unmarshal(bytes, i)
}

func (i AIEOGenerateContents) Value() (driver.Value, error) {
	if i == nil {
		return "[]", nil
	}
	return json.Marshal(i)
}

type SendStatus struct {
	Status  string `json:"status"`  // Waiting 等待, Success 收录成功, Failed 收录失败
	Message string `json:"message"` // 状态信息
}

type SendInfo struct {
	WebsiteLoginContextID int64         `json:"website_login_context_id"` // 关联的授权id
	Platform              string        `json:"platform"`                 // 收录平台
	Username              string        `json:"username"`                 // 平台的用户名
	Avatar                string        `json:"avatar"`                   // 头像
	SendStatus            []*SendStatus `json:"send_status"`              // 收录状态，Waiting 等待, Success 收录成功, Failed 收录失败
}

type SendInfos []*SendInfo

func (i *SendInfos) Scan(value interface{}) error {
	if value == nil {
		*i = SendInfos{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("unsupported type: %T", value)
	}
	return json.Unmarshal(bytes, i)
}

func (i SendInfos) Value() (driver.Value, error) {
	if i == nil {
		return "[]", nil
	}
	return json.Marshal(i)
}

type AIEOGenerate struct {
	ID                    int64                `json:"id"`
	CompanyID             int64                `json:"company_id"`
	UserID                int64                `json:"user_id"`
	Name                  string               `json:"name"`                     // 任务名称
	Keyword               string               `json:"keyword"`                  // 关键词
	TargetWord            string               `json:"target_word"`              // 目标词
	UserQuestions         StringSlice          `json:"user_questions"`           // 用户问题列表
	Type                  string               `json:"type"`                     // 任务类型 图文创作=Image, 文章创作=Article
	ImageLibraryIDList    Int64Slice           `json:"image_library_id_list"`    // 引用图片库ID列表
	MaterialLibraryIDList Int64Slice           `json:"material_library_id_list"` // 引用素材库ID列表
	CreateNum             int64                `json:"create_num"`               // 创作篇数
	Platform              string               `json:"platform"`                 // 目标平台
	Contents              AIEOGenerateContents `json:"contents"`                 // 创作内容列表

	Status string `json:"status"` // 状态 Running 蒸馏中, Cancel 取消, Success 蒸馏成功, Failed 蒸馏失败

	// 收录状态 NotSent 未收录, Sending 收录中, Success 已收录, Failed 收录失败, Cancel 已取消
	SendStatus string    `json:"send_status"`
	SendInfos  SendInfos `json:"send_infos"` // 收录信息列表

	ErrorInfo string `json:"error_info"` // 错误信息

	CreatedAt int64 `json:"created_at"` // 创建时间（时间戳）
	UpdatedAt int64 `json:"updated_at"` // 更新时间（时间戳）
}

// ImageLibraryList 图片库列表实体
type AIEOGenerateList struct {
	AIEOGenerates []*AIEOGenerate `json:"aieo_generates"`
	Total         int             `json:"total"`
}
