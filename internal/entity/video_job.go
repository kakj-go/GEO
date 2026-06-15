package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

type VideoSendInfo struct {
	WebsiteLoginContextID int64  `json:"website_login_context_id"` // 关联的授权id
	Platform              string `json:"platform"`                 // 收录平台
	Username              string `json:"username"`                 // 平台的用户名
	Avatar                string `json:"avatar"`                   // 头像

	Status  string `json:"status"`  // Waiting 等待, Success 收录成功, Failed 收录失败
	Message string `json:"message"` // 状态信息
}

type VideoSendInfos []*VideoSendInfo

func (i *VideoSendInfos) Scan(value interface{}) error {
	if value == nil {
		*i = VideoSendInfos{}
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

func (i VideoSendInfos) Value() (driver.Value, error) {
	if i == nil {
		return "[]", nil
	}
	return json.Marshal(i)
}

type VideoJob struct {
	ID        int64 `json:"id"`
	CompanyID int64 `json:"company_id"`
	UserID    int64 `json:"user_id"`

	Title       string `json:"title"`
	Description string `json:"description"`
	AssetsID    int64  `json:"assets_id"`

	// 收录状态 Sending 待收录, Success 已收录, Failed 收录失败, Cancel 已取消
	SendStatus string         `json:"send_status"`
	SendInfos  VideoSendInfos `json:"send_infos"` // 收录信息列表

	ErrorInfo string `json:"error_info"` // 错误信息

	CreatedAt int64 `json:"created_at"` // 创建时间（时间戳）
	UpdatedAt int64 `json:"updated_at"` // 更新时间（时间戳）
}

type VideoJobList struct {
	VideoJobs []*VideoJob `json:"video_jobs"`
	Total     int         `json:"total"`
}
