package v1

import (
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
)

// CreateAIEOGenerate 创建AIEO生成任务
// @Summary     创建AIEO生成任务
// @Description 创建新的AIEO生成任务
// @ID          create-aieo-generate
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Param       request body request.CreateAIEOGenerate true "AIEO生成任务信息"
// @Success     201 {object} response.Success{data=int64}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) CreateAIEOGenerate(c *fiber.Ctx) error {
	var req request.CreateAIEOGenerate
	if err := c.BodyParser(&req); err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := ctrl.v.Struct(req); err != nil {
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	generate := req.ToEntity()
	if err := ctrl.generate.CreateAIEOGenerate(c.UserContext(), generate); err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.Status(http.StatusCreated).JSON(response.Success{
		Success: true,
		Message: "AIEO生成任务创建成功",
		Data:    generate.ID,
	})
}

// UpdateAIEOGenerateContent 更新AIEO生成任务创作内容
// @Summary     更新AIEO生成任务创作内容
// @Description 只允许更新创作内容
// @ID          update-aieo-generate-content
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Param       id path int true "AIEO生成任务ID"
// @Param       request body request.UpdateAIEOGenerateContent true "创作内容"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) UpdateAIEOGenerateContent(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid ID")
	}

	var req request.UpdateAIEOGenerateContent
	if err := c.BodyParser(&req); err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := ctrl.v.Struct(req); err != nil {
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	if err := ctrl.generate.UpdateAIEOGenerateContent(c.UserContext(), id, req.Content); err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "创作内容更新成功",
	})
}

// CancelAIEOGenerate 取消AIEO生成任务（更新状态）
// @Summary     取消AIEO生成任务
// @Description 用于取消蒸馏过程
// @ID          cancel-aieo-generate
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Param       id path int true "AIEO生成任务ID"
// @Param       request body request.UpdateAIEOGenerateStatus true "状态信息"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) CancelAIEOGenerate(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid ID")
	}

	if err := ctrl.generate.UpdateAIEOGenerateStatus(c.UserContext(), id, "Cancel"); err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "任务状态更新成功",
	})
}

// DeleteAIEOGenerate 删除AIEO生成任务
// @Summary     删除AIEO生成任务
// @Description 删除指定的AIEO生成任务
// @ID          delete-aieo-generate
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Param       id path int true "AIEO生成任务ID"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) DeleteAIEOGenerate(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid ID")
	}

	if err := ctrl.generate.DeleteAIEOGenerate(c.UserContext(), id); err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "任务删除成功",
	})
}

// GetAIEOGenerateByID 获取AIEO生成任务详情（包含创作内容）
// @Summary     获取AIEO生成任务详情
// @Description 获取指定AIEO生成任务的详细信息，包含创作内容
// @ID          get-aieo-generate-by-id
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Param       id path int true "AIEO生成任务ID"
// @Success     200 {object} response.Success{data=entity.AIEOGenerate}
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) GetAIEOGenerateByID(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid ID")
	}

	generate, err := ctrl.generate.GetAIEOGenerateByID(c.UserContext(), id)
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	if generate == nil {
		return errorResponse(c, http.StatusNotFound, "AIEO生成任务不存在")
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "获取任务详情成功",
		Data:    generate,
	})
}

// GetAIEOGeneratesWithPage 分页查询AIEO生成任务列表（不返回创作内容）
// @Summary     分页查询AIEO生成任务列表
// @Description 分页查询AIEO生成任务列表，支持任务名称、关键词、用户问题等模糊查询，不返回创作内容
// @ID          get-aieo-generates-with-page
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Param       name query string false "任务名称"
// @Param       keyword query string false "关键词"
// @Param       user_questions query []string false "用户问题"
// @Param       page query int false "页码" default(1)
// @Param       page_size query int false "每页数量" default(10)
// @Success     200 {object} response.Success{data=response.PaginatedResponse{items=[]entity.AIEOGenerate}}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) GetAIEOGeneratesWithPage(c *fiber.Ctx) error {
	var req request.GetAIEOGeneratesRequest
	if err := c.QueryParser(&req); err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid query parameters")
	}

	// 设置默认值
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 10
	}

	if err := ctrl.v.Struct(req); err != nil {
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	generates, err := ctrl.generate.GetAIEOGeneratesWithPage(c.UserContext(), req.Name, req.Keyword, uint64(req.Page), uint64(req.PageSize))
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "获取任务列表成功",
		Data:    generates,
	})
}

// GenerateUserQuestions 生成用户可能会问到的问题
// @Summary     生成用户可能会问到的问题
// @Description 根据目标词和关键词生成用户可能会问到的问题
// @ID          generate-user-questions
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Param       req body request.GenerateUserQuestionsRequest true "生成用户问题请求"
// @Success     200 {object} response.Success{data=[]string}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) GenerateUserQuestions(c *fiber.Ctx) error {
	var req request.GenerateUserQuestionsRequest
	if err := c.BodyParser(&req); err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := ctrl.v.Struct(req); err != nil {
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	// 调用用例生成用户问题
	userQuestions, err := ctrl.generate.GenerateAIEOUserQuestion(c.UserContext(), req.Keyword, req.TargetWord, req.HistoryQuestions)
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "生成用户问题成功",
		Data:    userQuestions,
	})
}

// StartSend 开始发送AIEO生成任务
// @Summary     开始发送AIEO生成任务
// @Description 开始发送指定AIEO生成任务，将任务状态设置为发送中
// @ID          start-send-aieo-generate
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Param       id path int true "AIEO生成任务ID"
// @Success     200 {object} response.Success{message="任务发送中"}
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) StartSend(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid ID")
	}
	var req request.SendRequest
	if err := c.BodyParser(&req); err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := ctrl.v.Struct(req); err != nil {
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	if err := ctrl.generate.StartSend(c.UserContext(), id, req.WebsiteLoginContextIDs); err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "任务发送中",
	})
}

// ReportSendInfo 报告AIEO生成任务发送信息
// @Summary     报告AIEO生成任务发送信息
// @Description 报告指定AIEO生成任务的发送信息，包括状态和错误信息
// @ID          report-send-info-aieo-generate
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Param       id path int true "AIEO生成任务ID"
// @Param       req body request.ReportSendInfoRequest true "报告发送信息请求"
// @Success     200 {object} response.Success{message="发送信息报告成功"}
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) ReportSendInfo(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid ID")
	}
	var req request.ReportSendInfoRequest
	if err := c.BodyParser(&req); err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := ctrl.v.Struct(req); err != nil {
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	if err := ctrl.generate.ReportSendInfo(c.UserContext(), id, req); err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "发送信息报告成功",
	})
}

func (ctrl *V1) GetSendJob(c *fiber.Ctx) error {
	job, err := ctrl.generate.GetSendJob(c.UserContext())
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "获取任务列表成功",
		Data:    job,
	})
}

// GetMatrixStats 获取任务矩阵统计信息
// @Summary     获取任务矩阵统计信息
// @Description 获取总任务数、执行成功数、成功率等统计信息
// @ID          get-matrix-stats
// @Tags        aieo-generate
// @Accept      json
// @Produce     json
// @Success     200 {object} response.Success{data=response.MatrixStatsResponse}
// @Failure     500 {object} response.Error
func (ctrl *V1) GetMatrixStats(c *fiber.Ctx) error {
	stats, err := ctrl.generate.GetMatrixStats(c.UserContext())
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "获取统计信息成功",
		Data:    stats,
	})
}
