// internal/controller/http/v1/request/website_login_context.go
package request

import (
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

// CreateWebsiteLoginContext 创建网站登录上下文请求
type CreateWebsiteLoginContext struct {
	Username       string        `json:"username" validate:"required"`
	Avatar         string        `json:"avatar,omitempty"`
	Fingerprint    bool          `json:"fingerprint,omitempty"`
	Proxy          *entity.Proxy `json:"proxy,omitempty"`
	Platform       string        `json:"platform" validate:"required"`
	BrowserContext string        `json:"browser_context" validate:"required"`
	Tags           []string      `json:"tags,omitempty"`
	Status         int           `json:"status,omitempty"`
	DailyLimit     int           `json:"daily_limit,omitempty"`
}

// ToEntity 转换为实体
func (r *CreateWebsiteLoginContext) ToEntity() *entity.WebsiteLoginContext {
	return &entity.WebsiteLoginContext{
		Platform:       r.Platform,
		BrowserContext: r.BrowserContext,
		Tags:           r.Tags,
		Status:         r.Status,
		Username:       r.Username,
		Avatar:         r.Avatar,
		Fingerprint:    r.Fingerprint,
		Proxy:          r.Proxy,
		DailyLimit:     r.DailyLimit,
	}
}

// UpdateWebsiteLoginContext 更新网站登录上下文请求
type UpdateWebsiteLoginContext struct {
	Username       string        `json:"username" validate:"required"`
	Avatar         string        `json:"avatar,required"`
	Fingerprint    bool          `json:"fingerprint,omitempty"`
	Proxy          *entity.Proxy `json:"proxy,omitempty"`
	BrowserContext string        `json:"browser_context,omitempty"`
	Tags           []string      `json:"tags,omitempty"`
	Status         *int          `json:"status,omitempty"`
	DailyLimit     int           `json:"daily_limit,omitempty"`
}

// ToEntity 转换为实体
func (r *UpdateWebsiteLoginContext) ToEntity() *entity.WebsiteLoginContext {
	context := &entity.WebsiteLoginContext{
		BrowserContext: r.BrowserContext,
		Tags:           r.Tags,
		Username:       r.Username,
		Avatar:         r.Avatar,
		Fingerprint:    r.Fingerprint,
		Proxy:          r.Proxy,
	}
	if r.Status != nil {
		context.Status = *r.Status
	} else {
		context.Status = 2
	}
	context.DailyLimit = r.DailyLimit
	return context
}

// UpdateWebsiteLoginContextStatus 更新网站登录上下文状态请求
type UpdateWebsiteLoginContextStatus struct {
	Status int `json:"status" validate:"required,oneof=0 1"`
}

// BatchUpdateWebsiteLoginContextTags 批量更新网站登录上下文标签请求
type BatchUpdateWebsiteLoginContextTags struct {
	IDs  []int64 `json:"ids" validate:"required,min=1"`
	Tags string  `json:"tags" validate:"required"`
}
