package request

// CreateModel 创建模型请求
type CreateModel struct {
	ProviderName  string     `json:"provider_name" validate:"required,oneof=volcengine jimeng klingai"`
	ModelName     string     `json:"model_name" validate:"required"`
	BaseModel     string     `json:"base_model" validate:"required"`
	ModelType     string     `json:"model_type" validate:"required,oneof=llm embedding image_generation video_generation"`
	Credential    Credential `json:"credential" validate:"required"`
	Region        string     `json:"region,omitempty"`
	EndpointID    string     `json:"endpoint_id,omitempty"`
	ApiEndpoint   string     `json:"api_endpoint_host"`
	ContextLength int64      `json:"context_length"`
	IsDefault     bool       `json:"is_default,omitempty"`
}

// Credential 凭证信息
type Credential struct {
	Type   string `json:"type" validate:"required,oneof=api_key ak_sk"`
	ApiKey string `json:"api_key,omitempty"`
	AK     string `json:"ak,omitempty"`
	SK     string `json:"sk,omitempty"`
}

// UpdateModel 更新模型请求
type UpdateModel struct {
	ModelName     string     `json:"model_name" validate:"required"`
	BaseModel     string     `json:"base_model" validate:"required"`
	Credential    Credential `json:"credential" validate:"required"`
	Region        string     `json:"region,omitempty"`
	EndpointID    string     `json:"endpoint_id,omitempty"`
	ApiEndpoint   string     `json:"api_endpoint_host"`
	ContextLength int64      `json:"context_length"`
}

// UpdateModelStatus 更新模型状态请求
type UpdateModelStatus struct {
	Status string `json:"status" validate:"required,oneof=open close"`
}
