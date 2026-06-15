package v1

import (
	"github.com/go-playground/validator/v10"
	"github.com/kakj-go/llm_reference_matrix/internal/usecase"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
)

// V1 -.
// 在 V1 结构体中添加 imageLibrary 字段
type V1 struct {
	user                usecase.User
	company             usecase.Company
	auth                usecase.Auth
	websiteLoginContext usecase.WebsiteLoginContext
	assetsLibrary       usecase.AssetsLibrary
	materialLibrary     usecase.MaterialLibrary
	model               usecase.Model
	generate            usecase.AIEOGenerate
	videoJob            usecase.VideoJob
	copywriting         usecase.Copywriting
	billing             usecase.Billing
	l                   logger.Interface
	v                   *validator.Validate
}
