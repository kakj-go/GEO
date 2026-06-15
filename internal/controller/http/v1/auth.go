// v1/auth.go
package v1

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
)

func (r *V1) login(ctx *fiber.Ctx) error {
	var req request.LoginRequest
	if err := ctx.BodyParser(&req); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "无效的请求数据")
	}

	// 验证必要字段
	if req.Username == "" || req.Password == "" {
		return errorResponse(ctx, http.StatusBadRequest, "用户名和密码不能为空")
	}

	token, err := r.auth.Login(ctx.UserContext(), req.Username, req.Password)
	if err != nil {
		return errorResponse(ctx, http.StatusUnauthorized, err.Error())
	}

	//ctx.Set("Authorization", "Bearer "+token)

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "登陆成功",
		Data:    "Bearer " + token,
	})
}

func (r *V1) getInitStatus(ctx *fiber.Ctx) error {
	isInit, err := r.auth.GetInitStatus(ctx.UserContext())
	if err != nil {
		return errorResponse(ctx, http.StatusInternalServerError, "获取初始化状态失败")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Data:    isInit,
	})
}

func (r *V1) initSystem(ctx *fiber.Ctx) error {
	var req request.InitRequest
	if err := ctx.BodyParser(&req); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "无效的请求数据")
	}

	// 验证请求数据
	if err := r.v.Struct(req); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "请求参数校验失败")
	}

	token, err := r.auth.Init(ctx.UserContext(), req.CompanyName, req.Username, req.Password)
	if err != nil {
		return errorResponse(ctx, http.StatusInternalServerError, err.Error())
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "初始化成功",
		Data:    "Bearer " + token,
	})
}
