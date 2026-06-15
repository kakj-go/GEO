package v1

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
)

// @Summary     Create material
// @Description Create a new material in material library
// @ID          create-material
// @Tags        material-library
// @Accept      json
// @Produce     json
// @Param       request body request.CreateMaterialLibrary true "Material data"
// @Success     201 {object} response.Success{data=int64}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /material_library [post]
func (r *V1) createMaterial(ctx *fiber.Ctx) error {
	var body request.CreateMaterialLibrary
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	// 基本验证
	if body.Title == "" {
		return errorResponse(ctx, http.StatusBadRequest, "title is required")
	}
	if body.Content == "" {
		return errorResponse(ctx, http.StatusBadRequest, "content is required")
	}

	// 创建素材实体
	material := body.ToEntity()

	// 调用usecase创建素材
	err := r.materialLibrary.CreateMaterial(ctx.UserContext(), material)
	if err != nil {
		r.l.Error(err, "http - v1 - createMaterial")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to create material")
	}

	return ctx.Status(http.StatusCreated).JSON(response.Success{
		Success: true,
		Message: "material created successfully",
		Data:    material.ID,
	})
}

// @Summary     Get material by ID
// @Description Get material details by ID (includes content)
// @ID          get-material
// @Tags        material-library
// @Accept      json
// @Produce     json
// @Param       id path int64 true "Material ID"
// @Success     200 {object} response.Success{data=entity.MaterialLibrary}
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /material_library/{id} [get]
func (r *V1) getMaterial(ctx *fiber.Ctx) error {
	materialID, err := ctx.ParamsInt("id")
	if err != nil || materialID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid material id")
	}

	material, err := r.materialLibrary.GetMaterialByID(ctx.UserContext(), int64(materialID))
	if err != nil {
		r.l.Error(err, "http - v1 - getMaterial")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to get material")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "material retrieved successfully",
		Data:    material,
	})
}

// @Summary     Update material
// @Description Update material information
// @ID          update-material
// @Tags        material-library
// @Accept      json
// @Produce     json
// @Param       id path int64 true "Material ID"
// @Param       request body request.UpdateMaterialLibrary true "Material data"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /material_library/{id} [put]
func (r *V1) updateMaterial(ctx *fiber.Ctx) error {
	var body request.UpdateMaterialLibrary
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	materialID, err := ctx.ParamsInt("id")
	if err != nil || materialID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid material id")
	}

	material := body.ToEntity()
	material.ID = int64(materialID)

	if err := r.materialLibrary.UpdateMaterial(ctx.UserContext(), material); err != nil {
		r.l.Error(err, "http - v1 - updateMaterial")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to update material")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "material updated successfully",
		Data:    true,
	})
}

// @Summary     Delete material
// @Description Delete a material
// @ID          delete-material
// @Tags        material-library
// @Accept      json
// @Produce     json
// @Param       id path int64 true "Material ID"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /material_library/{id} [delete]
func (r *V1) deleteMaterial(ctx *fiber.Ctx) error {
	materialID, err := ctx.ParamsInt("id")
	if err != nil || materialID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid material id")
	}

	if err := r.materialLibrary.DeleteMaterial(ctx.UserContext(), int64(materialID)); err != nil {
		r.l.Error(err, "http - v1 - deleteMaterial")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to delete material")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "material deleted successfully",
		Data:    true,
	})
}

// @Summary     Get materials with pagination
// @Description Get paginated materials with filters (does not include content)
// @ID          get-materials
// @Tags        material-library
// @Accept      json
// @Produce     json
// @Param       page query int false "Page number" default(1)
// @Param       page_size query int false "Page size" default(10)
// @Param       title query string false "Title filter (partial match)"
// @Param       tag query string false "Tag filter" collectionFormat(multi)
// @Success     200 {object} response.Success{data=entity.MaterialLibraryListResponse}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /material_library [get]
func (r *V1) getMaterials(ctx *fiber.Ctx) error {
	page := ctx.QueryInt("page", 1)
	if page <= 0 {
		page = 1
	}

	pageSize := ctx.QueryInt("page_size", 10)
	if pageSize <= 0 {
		pageSize = 10
	}

	title := ctx.Query("title")
	tagParam := ctx.Query("tag")

	// 处理标签
	var tags []string
	if tagParam != "" {
		tags = []string{tagParam}
	}

	materialList, err := r.materialLibrary.GetMaterialsWithPage(ctx.UserContext(), tags, title, page, pageSize)
	if err != nil {
		r.l.Error(err, "http - v1 - getMaterials")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to get materials")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "materials retrieved successfully",
		Data:    materialList,
	})
}
