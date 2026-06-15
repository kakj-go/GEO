package v1

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

// @Summary     Upload asset
// @Description Upload a new asset to assets library
// @ID          upload-asset
// @Tags        assets-library
// @Accept      multipart/form-data
// @Produce     json
// @Param       asset formData file true "Asset file"
// @Param       description formData string true "Asset description"
// @Param       tags formData string false "Asset tags (comma separated)"
// @Param       is_public formData bool false "Is asset public"
// @Success     201 {object} response.Success{data=int64}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /assets_library [post]
func (r *V1) uploadAsset(ctx *fiber.Ctx) error {
	// 解析表单数据
	description := ctx.FormValue("description")
	title := ctx.FormValue("title")
	tagsStr := ctx.FormValue("tags")
	isPublicStr := ctx.FormValue("is_public")

	// 基本验证
	if description == "" {
		return errorResponse(ctx, http.StatusBadRequest, "description is required")
	}

	// 处理标签
	var tags []string
	if tagsStr != "" {
		err := json.Unmarshal([]byte(tagsStr), &tags)
		if err != nil {
			return errorResponse(ctx, http.StatusBadRequest, "invalid tags format")
		}
		// 清理标签中的空格
		for i, tag := range tags {
			tags[i] = strings.TrimSpace(tag)
		}
	}

	// 处理是否公开
	isPublic := false
	if isPublicStr != "" {
		var err error
		isPublic, err = strconv.ParseBool(isPublicStr)
		if err != nil {
			return errorResponse(ctx, http.StatusBadRequest, "invalid is_public value")
		}
	}

	// 获取文件
	file, err := ctx.FormFile("file")
	if err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "no asset file provided")
	}

	// 验证文件类型
	if !isValidImageType(file.Filename) && !isValidVideoType(file.Filename) {
		return errorResponse(ctx, http.StatusBadRequest, "invalid asset file type")
	}
	assetType := "image"
	if isValidVideoType(file.Filename) {
		assetType = "video"
	}

	if assetType == "video" && title == "" {
		return errorResponse(ctx, http.StatusBadRequest, "title is required")
	}

	// 打开文件
	src, err := file.Open()
	if err != nil {
		return errorResponse(ctx, http.StatusInternalServerError, "failed to open file")
	}
	defer src.Close()

	// 读取文件内容
	fileData, err := io.ReadAll(src)
	if err != nil {
		return errorResponse(ctx, http.StatusInternalServerError, "failed to read file")
	}

	// 创建资源实体
	asset := &entity.AssetsLibrary{
		Description: description,
		Tags:        tags,
		Title:       title,
		Type:        assetType,
		IsPublic:    isPublic,
		Size:        file.Size,
		Suffix:      getFileExtension(file.Filename),
	}

	// 调用 usecase 上传资源
	err = r.assetsLibrary.UploadAsset(ctx.UserContext(), asset, fileData)
	if err != nil {
		r.l.Error(err, "http - v1 - uploadAsset")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to upload asset")
	}

	return ctx.Status(http.StatusCreated).JSON(response.Success{
		Success: true,
		Message: "asset uploaded successfully",
		Data:    asset.ID,
	})
}

// @Summary     Get asset by ID
// @Description Get asset details by ID
// @ID          get-asset
// @Tags        assets-library
// @Accept      json
// @Produce     json
// @Param       id path int64 true "Asset ID"
// @Success     200 {object} response.Success{data=request.AssetsLibraryResponse}
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /assets_library/{id} [get]
func (r *V1) getAsset(ctx *fiber.Ctx) error {
	assetID, err := ctx.ParamsInt("id")
	if err != nil || assetID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid asset id")
	}

	asset, err := r.assetsLibrary.GetAssetByID(ctx.UserContext(), int64(assetID))
	if err != nil {
		r.l.Error(err, "http - v1 - getAsset")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to get asset")
	}

	// 转换为响应对象
	responseData := request.ToAssetsLibraryResponse(asset)

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "asset retrieved successfully",
		Data:    responseData,
	})
}

// 修改getAssets接口
// @Summary     Get assets with pagination
// @Description Get paginated assets with filters
// @ID          get-assets
// @Tags        assets-library
// @Accept      json
// @Produce     json
// @Param       page query int false "Page number" default(1)
// @Param       page_size query int false "Page size" default(10)
// @Param       description query string false "Description filter (partial match)"
// @Param       tag query string false "Tag filter" collectionFormat(multi)
// @Param       is_public query bool false "Public filter"
// @Success     200 {object} response.Success{data=request.AssetsLibraryListResponse}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /assets_library [get]
func (r *V1) getAssets(ctx *fiber.Ctx) error {
	page := ctx.QueryInt("page", 1)
	if page <= 0 {
		page = 1
	}

	pageSize := ctx.QueryInt("page_size", 10)
	if pageSize <= 0 {
		pageSize = 10
	}

	description := ctx.Query("description")
	tagParam := ctx.Query("tags")
	typer := ctx.Query("type")
	isPublicStr := ctx.Query("is_public")

	// 处理标签
	var tags []string
	if tagParam != "" {
		tags = strings.Split(tagParam, ",")
	}

	// 处理是否公开
	var isPublic *bool
	if isPublicStr != "" {
		val, err := strconv.ParseBool(isPublicStr)
		if err != nil {
			return errorResponse(ctx, http.StatusBadRequest, "invalid is_public value")
		}
		isPublic = &val
	}

	assetList, err := r.assetsLibrary.GetAssetsWithPage(ctx.UserContext(), tags, description, isPublic, typer, page, pageSize)
	if err != nil {
		r.l.Error(err, "http - v1 - getAssets")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to get assets")
	}

	// 转换为响应对象
	responseData := request.ToAssetsLibraryListResponse(assetList)

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "assets retrieved successfully",
		Data:    responseData,
	})
}

// @Summary     Update asset
// @Description Update asset information (only description, tags, is_public allowed)
// @ID          update-asset
// @Tags        assets-library
// @Accept      json
// @Produce     json
// @Param       id path int64 true "Asset ID"
// @Param       request body request.UpdateAssetsLibrary true "Asset data"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /assets_library/{id} [put]
func (r *V1) updateAsset(ctx *fiber.Ctx) error {
	var body request.UpdateImageLibrary
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	assetID, err := ctx.ParamsInt("id")
	if err != nil || assetID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid asset id")
	}

	asset := body.ToEntity()
	asset.ID = int64(assetID)

	if err := r.assetsLibrary.UpdateAsset(ctx.UserContext(), asset); err != nil {
		r.l.Error(err, "http - v1 - updateAsset")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to update asset")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "asset updated successfully",
		Data:    true,
	})
}

// @Summary     Delete asset
// @Description Delete an asset
// @ID          delete-asset
// @Tags        assets-library
// @Accept      json
// @Produce     json
// @Param       id path int64 true "Asset ID"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /assets_library/{id} [delete]
func (r *V1) deleteAsset(ctx *fiber.Ctx) error {
	assetID, err := ctx.ParamsInt("id")
	if err != nil || assetID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid asset id")
	}

	if err := r.assetsLibrary.DeleteAsset(ctx.UserContext(), int64(assetID)); err != nil {
		r.l.Error(err, "http - v1 - deleteAsset")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to delete asset")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "asset deleted successfully",
		Data:    true,
	})
}

// 辅助函数，验证视频类型
// 辅助函数，验证视频类型
func isValidVideoType(filename string) bool {
	extensions := map[string]bool{
		".mp4":  true,
		".avi":  true,
		".mov":  true,
		".wmv":  true,
		".flv":  true,
		".webm": true,
		".mkv":  true,
		".mpeg": true,
		".mpg":  true,
		".3gp":  true,
		".ogg":  true,
	}

	ext := strings.ToLower(getFileExtension(filename))
	return extensions["."+ext]
}

// 辅助函数：验证图片类型
func isValidImageType(filename string) bool {
	extensions := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
		".bmp":  true,
	}

	ext := strings.ToLower(getFileExtension(filename))
	return extensions["."+ext]
}

// 辅助函数：获取文件扩展名
func getFileExtension(filename string) string {
	parts := strings.Split(filename, ".")
	if len(parts) < 2 {
		return ""
	}
	return strings.ToLower(parts[len(parts)-1])
}
