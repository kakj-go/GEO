package config

import (
	_ "embed"
	"fmt"

	"github.com/caarlos0/env/v11"
)

//go:embed pricing.yaml
var PricingYAML []byte

var cfg *Config

type (
	// Config -.
	Config struct {
		App     App
		HTTP    HTTP
		Log     Log
		Mysql   MYSQL
		Metrics Metrics
		Swagger Swagger
		Jwt     JWT
		AIEO    AIEO
		APIMart APIMart
		Debug   bool `env:"DEBUG" envDefault:"true"`
	}

	APIMart struct {
		ApiKey string `env:"APIMART_API_KEY" envDefault:""`
	}

	AIEO struct {
		UserQuestionPrompt string `env:"USER_QUESTM_PROMPT" envDefault:""`
		ContentPrompt      string `env:"CONTENT_PROMPT" envDefault:""`
	}

	// App -.
	App struct {
		Name              string `env:"APP_NAME" envDefault:"SuperLink"`
		Version           string `env:"APP_VERSION" envDefault:"1.0.0"`
		AssetsLibraryPath string `env:"APP_ASSETS_LIBRARY_PATH" envDefault:"./assets"`
		CopywritingPath   string `env:"APP_COPYWRITING_PATH" envDefault:"./llm/copywriting"`
		Host              string `env:"APP_HOST" envDefault:"http://localhost:8080"`
	}

	// HTTP -.
	HTTP struct {
		Port           string `env:"HTTP_PORT" envDefault:"8080"`
		UsePreforkMode bool   `env:"HTTP_USE_PREFORK_MODE" envDefault:"false"`
	}

	// Log -.
	Log struct {
		Level string `env:"LOG_LEVEL" envDefault:"info"`
	}

	// MYSQL -.
	MYSQL struct {
		PoolMax int    `env:"MYSQL_POOL_MAX" envDefault:"2"`
		URL     string `env:"MYSQL_URL" envDefault:""`
	}

	// Metrics -.
	Metrics struct {
		Enabled bool `env:"METRICS_ENABLED" envDefault:"true"`
	}

	// JWT -.
	JWT struct {
		Secret          string   `env:"JWT_SECRET" envDefault:"desktop_application_secret_key"`
		WhiteListRoutes []string `env:"JWT_WHITELISTROP" envSeparator:","`
	}

	// Swagger -.
	Swagger struct {
		Enabled bool `env:"SWAGGER_ENABLED" envDefault:"false"`
	}
)

// NewConfig returns app config.
func NewConfig() (*Config, error) {
	cfg = &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("config error: %w", err)
	}

	// 设置默认的白名单路由（如果环境变量未设置）
	if len(cfg.Jwt.WhiteListRoutes) == 0 {
		cfg.Jwt.WhiteListRoutes = getDefaultWhiteList()
	}

	if cfg.AIEO.UserQuestionPrompt == "" {
		cfg.AIEO.UserQuestionPrompt = `
帮我根据下面的关键词和目标词生成一些用户可能会问到或者关联的的问题，注意不能重复，只返回 json 字符串数组的形式

### 关键词
%s

### 目标词
%s

### 已经生成过的问题
%s
`
	}

	if cfg.AIEO.ContentPrompt == "" {
		cfg.AIEO.ContentPrompt = `
你是一个AIEO 文章生成专家，现在需要你根据用户提供的目标词，问题，图片，知识库生成推广需要的文章

### 注意事项
1. 生成的内容要为 markdown 格式
2. 如果提供了参考图片素材，则根据描述在文章合适的位置使用 markdown 语法引用；如果没有提供参考图片素材，则生成的文章中严禁包含任何图片 markdown 元素。
3. 内容中只能存在 标题，普通文本内容，有序列表，无序列表以及图片（只有在提供了参考图片素材时才允许）这几个markdown元素
4. 生成的内容不能和历史文章梗概重复
5. 返回 json 数据结构，{"content": "生成的文章markdown内容", "title": "文章标题", "synopsis": "文章的摘要"}

### 目标词
%s

### 用户问题
%s

### 图片
%s

### 知识库
%s

### 历史文章梗概
%s
`
	}

	return cfg, nil
}

// GetConfig returns the config instance.
func GetConfig() *Config {
	return cfg
}

// getDefaultWhiteList returns default white list routes.
func getDefaultWhiteList() []string {
	return []string{
		"/healthz",
		"/metrics",
		"/v1/auth/login",
		"/v1/auth/init_status",
		"/v1/auth/init",
		"/swagger/*",
		"/assets/*",
	}
}
