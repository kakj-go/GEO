package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

type Proxy struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Protocol string `json:"protocol"` // http or https
}

// Scan 实现 sql.Scanner 接口
func (p *Proxy) Scan(value interface{}) error {
	if value == nil {
		*p = Proxy{}
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

	return json.Unmarshal(bytes, p)
}

func (p Proxy) Value() (driver.Value, error) {
	// 如果代理为空，返回空字符串
	if p == (Proxy{}) {
		return "", nil
	}
	bytes, err := json.Marshal(p)
	return string(bytes), err
}

// WebsiteLoginContext 网站登录上下文实体
type WebsiteLoginContext struct {
	ID             int64       `json:"id"`
	CompanyID      int64       `json:"company_id"`
	UserID         int64       `json:"user_id"`
	Username       string      `json:"username"`
	Avatar         string      `json:"avatar"` // 头像地址
	Platform       string      `json:"platform"`
	BrowserContext string      `json:"browser_context"` // JSON 格式字符串
	Tags           StringSlice `json:"tags"`            // JSON 数组格式字符串
	Status         int         `json:"status"`          // 1:有效, 0:无效
	Proxy          *Proxy      `json:"proxy"`
	Fingerprint    bool        `json:"fingerprint"` // 指纹
	DailyLimit     int         `json:"daily_limit"`
	TodayCount     int         `json:"today_count"`
	LastResetAt    int64       `json:"last_reset_at"`
	CreatedAt      int64       `json:"created_at"`
	UpdatedAt      int64       `json:"updated_at"`
}

// WebsiteLoginContextList - 网站登录上下文列表.
type WebsiteLoginContextList struct {
	Contexts []*WebsiteLoginContext `json:"contexts"`
	Total    int                    `json:"total"`
	Page     int                    `json:"page"`
	Size     int                    `json:"size"`
}
