package v1

import (
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
)

// CreateVideoJob 创建视频任务
// @Summary     创建视频任务
// @Description 创建新的视频任务
// @ID          create-video-job
// @Tags        video-job
// @Accept      json
// @Produce     json
// @Param       request body request.CreateVideoJob true "视频任务信息"
// @Success     201 {object} response.Success{data=int64}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) CreateVideoJob(c *fiber.Ctx) error {
	var req request.CreateVideoJob
	if err := c.BodyParser(&req); err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := ctrl.v.Struct(req); err != nil {
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	videoJob := req.ToEntity()
	if err := ctrl.videoJob.CreateVideoJob(c.UserContext(), videoJob); err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.Status(http.StatusCreated).JSON(response.Success{
		Success: true,
		Message: "视频任务创建成功",
		Data:    videoJob.ID,
	})
}

// GetVideoJobByID 根据ID获取视频任务
// @Summary     根据ID获取视频任务
// @Description 获取指定ID的视频任务详情
// @ID          get-video-job-by-id
// @Tags        video-job
// @Accept      json
// @Produce     json
// @Param       id path int true "视频任务ID"
// @Success     200 {object} response.Success{data=entity.VideoJob}
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) GetVideoJobByID(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid ID")
	}

	videoJob, err := ctrl.videoJob.GetVideoJobByID(c.UserContext(), id)
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	if videoJob == nil {
		return errorResponse(c, http.StatusNotFound, "视频任务不存在")
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "获取视频任务详情成功",
		Data:    videoJob,
	})
}

// UpdateVideoJobSendStatus 更新视频任务收录状态
// @Summary     更新视频任务收录状态
// @Description 更新指定视频任务的收录状态
// @ID          update-video-job-send-status
// @Tags        video-job
// @Accept      json
// @Produce     json
// @Param       id path int true "视频任务ID"
// @Param       request body request.UpdateVideoJobSendStatus true "收录状态信息"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) UpdateVideoJobSendStatus(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid ID")
	}

	var req request.UpdateVideoJobSendStatus
	if err := c.BodyParser(&req); err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	if err := ctrl.v.Struct(req); err != nil {
		return errorResponse(c, http.StatusBadRequest, err.Error())
	}

	if err := ctrl.videoJob.UpdateVideoJobSendStatus(c.UserContext(), id, req.Status, req.Message, req.RecordID); err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "视频任务收录状态更新成功",
	})
}

// GetVideoJobsWithPage 分页查询视频任务列表
// @Summary     分页查询视频任务列表
// @Description 分页查询视频任务列表，支持按标题和收录状态筛选
// @ID          get-video-jobs-with-page
// @Tags        video-job
// @Accept      json
// @Produce     json
// @Param       title query string false "视频标题"
// @Param       send_status query string false "收录状态"
// @Param       page query int false "页码" default(1)
// @Param       page_size query int false "每页数量" default(10)
// @Success     200 {object} response.Success{data=entity.VideoJobList}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) GetVideoJobsWithPage(c *fiber.Ctx) error {
	var req request.GetVideoJobsRequest
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

	videoJobs, err := ctrl.videoJob.GetVideoJobsWithPage(c.UserContext(), req.Title, req.SendStatus, req.AssetsID, req.Page, req.PageSize)
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "获取视频任务列表成功",
		Data:    videoJobs,
	})
}

// CancelVideoJob 取消视频任务
// @Summary     取消视频任务
// @Description 取消指定的视频任务
// @ID          cancel-video-job
// @Tags        video-job
// @Accept      json
// @Produce     json
// @Param       id path int true "视频任务ID"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
func (ctrl *V1) CancelVideoJob(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid ID")
	}

	if err := ctrl.videoJob.CancelVideoJob(c.UserContext(), id); err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Message: "视频任务取消成功",
	})
}
