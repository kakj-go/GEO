// material_library.go - 素材库相关请求模型
package request

import (
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

// CreateMaterialLibrary 创建素材库请求
type CreateMaterialLibrary struct {
	Title   string   `json:"title" validate:"required"`
	Content string   `json:"content" validate:"required"`
	Tags    []string `json:"tags,omitempty"`
}

// ToEntity 转换为实体
func (r *CreateMaterialLibrary) ToEntity() *entity.MaterialLibrary {
	return &entity.MaterialLibrary{
		Title:   r.Title,
		Content: r.Content,
		Tags:    r.Tags,
	}
}

// UpdateMaterialLibrary 更新素材库请求
type UpdateMaterialLibrary struct {
	Title   string   `json:"title" validate:"required"`
	Content string   `json:"content" validate:"required"`
	Tags    []string `json:"tags,omitempty"`
}

// ToEntity 转换为实体
func (r *UpdateMaterialLibrary) ToEntity() *entity.MaterialLibrary {
	return &entity.MaterialLibrary{
		Title:   r.Title,
		Content: r.Content,
		Tags:    r.Tags,
	}
}
