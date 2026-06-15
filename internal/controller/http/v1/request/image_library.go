// image_library.go - 图片库相关请求模型
package request

import (
	"fmt"

	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

// UpdateImageLibrary 更新图片库请求
type UpdateImageLibrary struct {
	Title       string   `json:"title"`
	Description string   `json:"description" validate:"required"`
	Tags        []string `json:"tags,omitempty"`
	IsPublic    bool     `json:"is_public" validate:"required"`
}

// ToEntity 转换为实体
func (r *UpdateImageLibrary) ToEntity() *entity.AssetsLibrary {
	return &entity.AssetsLibrary{
		Title:       r.Title,
		Description: r.Description,
		Tags:        r.Tags,
		IsPublic:    r.IsPublic,
	}
}

// ImageLibraryResponse 图片库详情响应
type AssetsLibraryResponse struct {
	ID          int64    `json:"id"`
	Path        string   `json:"path"`
	Title       string   `json:"title"`
	Type        string   `json:"type"`
	Description string   `json:"description"`
	Size        int64    `json:"size"`
	Suffix      string   `json:"suffix"`
	Tags        []string `json:"tags"`
	UserID      int64    `json:"userID"`
	CompanyID   int64    `json:"companyID"`
	IsPublic    bool     `json:"isPublic"`
	CreatedAt   int64    `json:"createdAt"`
	UpdatedAt   int64    `json:"updatedAt"`
}

// AssetsLibraryListResponse 资产库列表响应
type AssetsLibraryListResponse struct {
	Assets []*AssetsLibraryResponse `json:"assets"`
	Total  int                      `json:"total"`
	Page   int                      `json:"page"`
	Size   int                      `json:"size"`
}

// ToResponse 将实体转换为响应
func ToAssetsLibraryResponse(image *entity.AssetsLibrary) *AssetsLibraryResponse {
	return &AssetsLibraryResponse{
		ID:          image.ID,
		Path:        fmt.Sprintf("%s/%s/%s", config.GetConfig().App.Host, "assets", image.Path),
		Title:       image.Title,
		Type:        image.Type,
		Description: image.Description,
		Size:        image.Size,
		Suffix:      image.Suffix,
		Tags:        image.Tags,
		UserID:      image.UserID,
		CompanyID:   image.CompanyID,
		IsPublic:    image.IsPublic,
		CreatedAt:   image.CreatedAt,
		UpdatedAt:   image.UpdatedAt,
	}
}

// ToImageLibraryListResponse 将实体列表转换为响应列表
func ToAssetsLibraryListResponse(imageList *entity.AssetsLibraryList) *AssetsLibraryListResponse {
	response := &AssetsLibraryListResponse{
		Total:  imageList.Total,
		Page:   imageList.Page,
		Size:   imageList.Size,
		Assets: make([]*AssetsLibraryResponse, 0, len(imageList.Assets)),
	}

	for _, image := range imageList.Assets {
		response.Assets = append(response.Assets, ToAssetsLibraryResponse(image))
	}

	return response
}
