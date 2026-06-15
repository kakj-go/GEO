package v1

import (
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

// CreateModel 创建模型
// @Summary     创建模型
// @Description 创建新的模型配置
// @ID          create-model
// @Tags        model
// @Accept      json
// @Produce     json
// @Param       request body request.CreateModel true "模型信息"
// @Success     201 {object} response.Success{data=int64}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /models [post]
func (v *V1) CreateModel(c *fiber.Ctx) error {
	var req request.CreateModel
	if err := c.BodyParser(&req); err != nil {
		v.l.Error("V1 - CreateModel - BodyParser: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := v.v.Struct(req); err != nil {
		v.l.Error("V1 - CreateModel - Validate: %v", err)
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	// 转换为实体
	model := &entity.Model{
		ProviderName: req.ProviderName,
		ModelName:    req.ModelName,
		BaseModel:    req.BaseModel,
		ModelType:    req.ModelType,
		Credential: entity.Credential{
			Type:   req.Credential.Type,
			ApiKey: req.Credential.ApiKey,
			AK:     req.Credential.AK,
			SK:     req.Credential.SK,
		},
		Region:          req.Region,
		EndpointID:      req.EndpointID,
		ApiEndpointHost: req.ApiEndpoint,
		ContextLength:   req.ContextLength,
		IsDefault:       req.IsDefault,
	}

	err := v.model.CreateModel(c.UserContext(), model)
	if err != nil {
		v.l.Error("V1 - CreateModel - modelUsecase.CreateModel: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.Status(http.StatusCreated).JSON(response.Success{
		Success: true,
		Message: "Model created successfully",
		Data:    model.ID,
	})
}

// UpdateModel 更新模型
// @Summary     更新模型
// @Description 更新模型配置信息
// @ID          update-model
// @Tags        model
// @Accept      json
// @Produce     json
// @Param       id   path     int                 true "模型ID"
// @Param       request body request.UpdateModel true "模型信息"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /models/{id} [put]
func (v *V1) UpdateModel(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		v.l.Error("V1 - UpdateModel - ParseInt: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid model ID")
	}

	var req request.UpdateModel
	if err := c.BodyParser(&req); err != nil {
		v.l.Error("V1 - UpdateModel - BodyParser: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := v.v.Struct(req); err != nil {
		v.l.Error("V1 - UpdateModel - Validate: %v", err)
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	// 转换为实体
	model := &entity.Model{
		ID:        id,
		ModelName: req.ModelName,
		BaseModel: req.BaseModel,
		Credential: entity.Credential{
			Type:   req.Credential.Type,
			ApiKey: req.Credential.ApiKey,
			AK:     req.Credential.AK,
			SK:     req.Credential.SK,
		},
		Region:          req.Region,
		EndpointID:      req.EndpointID,
		ApiEndpointHost: req.ApiEndpoint,
		ContextLength:   req.ContextLength,
	}

	err = v.model.UpdateModel(c.UserContext(), model)
	if err != nil {
		v.l.Error("V1 - UpdateModel - modelUsecase.UpdateModel: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "Model updated successfully",
	})
}

// DeleteModel 删除模型
// @Summary     删除模型
// @Description 删除指定的模型
// @ID          delete-model
// @Tags        model
// @Accept      json
// @Produce     json
// @Param       id path int true "模型ID"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /models/{id} [delete]
func (v *V1) DeleteModel(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		v.l.Error("V1 - DeleteModel - ParseInt: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid model ID")
	}

	err = v.model.DeleteModel(c.UserContext(), id)
	if err != nil {
		v.l.Error("V1 - DeleteModel - modelUsecase.DeleteModel: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "Model deleted successfully",
	})
}

// GetModelByID 根据ID获取模型
// @Summary     获取模型详情
// @Description 根据ID获取模型详细信息
// @ID          get-model
// @Tags        model
// @Accept      json
// @Produce     json
// @Param       id path int true "模型ID"
// @Success     200 {object} response.Success{data=entity.Model}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /models/{id} [get]
func (v *V1) GetModelByID(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		v.l.Error("V1 - GetModelByID - ParseInt: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid model ID")
	}

	model, err := v.model.GetModelByID(c.UserContext(), id)
	if err != nil {
		v.l.Error("V1 - GetModelByID - modelUsecase.GetModelByID: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Data:    model,
	})
}

// GetModels 获取模型列表
// @Summary     获取模型列表
// @Description 分页查询模型列表
// @ID          get-models
// @Tags        model
// @Accept      json
// @Produce     json
// @Param       model_type query string false "模型类型"
// @Param       status     query string false "模型状态"
// @Param       page       query int    false "页码" default(1)
// @Param       size       query int    false "每页数量" default(10)
// @Success     200 {object} response.Success{data=entity.ModelList}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /models [get]
func (v *V1) GetModels(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	if page <= 0 {
		page = 1
	}

	pageSize := c.QueryInt("page_size", 10)
	if pageSize <= 0 {
		pageSize = 10
	}

	models, err := v.model.GetModelsWithPage(c.UserContext(), "", "", page, pageSize)
	if err != nil {
		v.l.Error("V1 - GetModels - modelUsecase.GetModelsWithPage: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Data:    models,
	})
}

// UpdateModelStatus 更新模型状态
// @Summary     更新模型状态
// @Description 开启或关闭模型
// @ID          update-model-status
// @Tags        model
// @Accept      json
// @Produce     json
// @Param       id   path     int                        true "模型ID"
// @Param       request body request.UpdateModelStatus true "状态信息"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /models/{id}/status [put]
func (v *V1) UpdateModelStatus(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		v.l.Error("V1 - UpdateModelStatus - ParseInt: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid model ID")
	}

	var req request.UpdateModelStatus
	if err := c.BodyParser(&req); err != nil {
		v.l.Error("V1 - UpdateModelStatus - BodyParser: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := v.v.Struct(req); err != nil {
		v.l.Error("V1 - UpdateModelStatus - Validate: %v", err)
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	err = v.model.UpdateModelStatus(c.UserContext(), id, req.Status)
	if err != nil {
		v.l.Error("V1 - UpdateModelStatus - modelUsecase.UpdateModelStatus: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "Model status updated successfully",
	})
}

// TestModelConnectivity 测试模型连接
// @Summary     测试模型连接
// @Description 测试模型的连接状态
// @ID          test-model-connectivity
// @Tags        model
// @Accept      json
// @Produce     json
// @Param       id path int true "模型ID"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /models/{id}/test-connectivity [post]
func (v *V1) TestModelConnectivity(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		v.l.Error("V1 - TestModelConnectivity - ParseInt: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid model ID")
	}

	err = v.model.TestModelConnectivity(c.UserContext(), id)
	if err != nil {
		v.l.Error("V1 - TestModelConnectivity - modelUsecase.TestModelConnectivity: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "Model connectivity test passed",
	})
}

// SetDefaultModel 设置默认模型
// @Summary     设置默认模型
// @Description 将指定模型设置为同类型的默认模型
// @ID          set-default-model
// @Tags        model
// @Accept      json
// @Produce     json
// @Param       id path int true "模型ID"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /models/{id}/set-default [post]
func (v *V1) SetDefaultModel(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		v.l.Error("V1 - SetDefaultModel - ParseInt: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid model ID")
	}

	err = v.model.SetDefaultModel(c.UserContext(), id)
	if err != nil {
		v.l.Error("V1 - SetDefaultModel - modelUsecase.SetDefaultModel: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "Model set as default successfully",
	})
}

// GetDefaultModel 获取默认模型
// @Summary     获取默认模型
// @Description 获取指定类型的默认模型
// @ID          get-default-model
// @Tags        model
// @Accept      json
// @Produce     json
// @Param       model_type query string true "模型类型"
// @Success     200 {object} response.Success{data=entity.Model}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /models/get_default [get]
func (v *V1) GetDefaultModel(c *fiber.Ctx) error {
	modelType := c.Query("model_type")
	if modelType == "" {
		return errorResponse(c, http.StatusBadRequest, "model_type is required")
	}

	model, err := v.model.GetDefaultModel(c.UserContext(), modelType)
	if err != nil {
		v.l.Error("V1 - GetDefaultModel - modelUsecase.GetDefaultModel: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Data:    model,
	})
}

// SetBuiltinDefaultModel 设置内置默认模型
func (v *V1) SetBuiltinDefaultModel(c *fiber.Ctx) error {
	type SetBuiltinDefaultReq struct {
		ModelType string `json:"model_type" validate:"required"`
		ModelID   string `json:"model_id" validate:"required"`
	}

	var req SetBuiltinDefaultReq
	if err := c.BodyParser(&req); err != nil {
		v.l.Error("V1 - SetBuiltinDefaultModel - BodyParser: %v", err)
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := v.v.Struct(req); err != nil {
		v.l.Error("V1 - SetBuiltinDefaultModel - Validate: %v", err)
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	err := v.model.SetBuiltinDefaultModel(c.UserContext(), req.ModelType, req.ModelID)
	if err != nil {
		v.l.Error("V1 - SetBuiltinDefaultModel - modelUsecase.SetBuiltinDefaultModel: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "Builtin default model set successfully",
	})
}

// GetBuiltinDefaultModel 获取内置默认模型
func (v *V1) GetBuiltinDefaultModel(c *fiber.Ctx) error {
	modelType := c.Query("model_type")
	if modelType == "" {
		return errorResponse(c, http.StatusBadRequest, "model_type is required")
	}

	modelID, err := v.model.GetBuiltinDefaultModel(c.UserContext(), modelType)
	if err != nil {
		v.l.Error("V1 - GetBuiltinDefaultModel - modelUsecase.GetBuiltinDefaultModel: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Data: map[string]string{
			"model_type": modelType,
			"model_id":   modelID,
		},
	})
}

// GetAllBuiltinDefaults 获取所有类型的内置默认模型
func (v *V1) GetAllBuiltinDefaults(c *fiber.Ctx) error {
	types := []string{"image_generation", "video_generation", "llm"}
	defaults := make(map[string]string)

	for _, t := range types {
		modelID, err := v.model.GetBuiltinDefaultModel(c.UserContext(), t)
		if err != nil {
			defaults[t] = ""
			continue
		}
		defaults[t] = modelID
	}

	return c.JSON(response.Success{
		Success: true,
		Data:    defaults,
	})
}

// GetModelPricing 获取模型计价
func (v *V1) GetModelPricing(c *fiber.Ctx) error {
	pricing, err := v.model.GetModelPricing(c.UserContext())
	if err != nil {
		v.l.Error("V1 - GetModelPricing - model.GetModelPricing: %v", err)
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Data:    pricing,
	})
}
