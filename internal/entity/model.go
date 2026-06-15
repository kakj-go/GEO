package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

type Credential struct {
	Type   string `json:"type"`    // 模型类型 api_key / ak_sk
	ApiKey string `json:"api_key"` // API密钥
	AK     string `json:"ak"`      // 访问密钥
	SK     string `json:"sk"`      // 秘密密钥
}

// Scan 实现 sql.Scanner 接口
func (c *Credential) Scan(value interface{}) error {
	if value == nil {
		*c = Credential{}
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

	return json.Unmarshal(bytes, c)
}

// Value 实现 driver.Valuer 接口
func (c Credential) Value() (driver.Value, error) {
	if c == (Credential{}) {
		return "{}", nil
	}
	return json.Marshal(c)
}

// Model represents a Model entity.
type Model struct {
	ID int64 `json:"id"`

	ProviderName string     `json:"provider_name"` // 模型供应商名称
	ModelName    string     `json:"model_name"`    // 模型名称
	BaseModel    string     `json:"base_model"`    // 基础模型名称
	ModelType    string     `json:"model_type"`    // 模型类型 llm / embedding
	Credential   Credential `json:"credential"`    // 模型凭证

	Region          string `json:"region"`            // 模型所在区域
	EndpointID      string `json:"endpoint_id"`       // 模型端点ID
	ApiEndpointHost string `json:"api_endpoint_host"` // API端点主机

	Status             string `json:"status"`              // 模型状态 open / close
	ConnectivityStatus string `json:"connectivity_status"` // 模型连接状态 success / failed / not_tested

	ContextLength int64 `json:"context_length"` // 上下文长度/最大token数
	IsDefault     bool  `json:"is_default"`     // 是否默认模型

	UserID    int64 `json:"user_id"`    // 创建用户ID
	CompanyID int64 `json:"company_id"` // 所属公司ID
	CreatedAt int64 `json:"created_at"` // 创建时间（时间戳）
	UpdatedAt int64 `json:"updated_at"` // 更新时间（时间戳）
}

// ModelList - 模型列表响应结构.
type ModelList struct {
	Models []*Model `json:"models"`
	Total  int      `json:"total"`
	Page   int      `json:"page"`
	Size   int      `json:"size"`
}

type ModelPricing struct {
	InputPrice  int64 `json:"input_price" yaml:"inputPrice"`
	OutputPrice int64 `json:"output_price" yaml:"outputPrice"`
}

type ModelPricingConfig struct {
	Models []struct {
		ID           string `yaml:"id"`
		ModelPricing `yaml:",inline"`
	} `yaml:"models"`
}
