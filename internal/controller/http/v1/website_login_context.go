package v1

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
)

// @Summary     Create website login context
// @Description Create a new website login context
// @ID          create-website-login-context
// @Tags        website-login-context
// @Accept      json
// @Produce     json
// @Param       request body     request.CreateWebsiteLoginContext true "Website login context data"
// @Success     201 {object} response.Success{data=int64}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /website_login_context [post]
func (r *V1) createWebsiteLoginContext(ctx *fiber.Ctx) error {
	var body request.CreateWebsiteLoginContext
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	// 参数验证
	if body.Platform == "" || !constants.IsValidPlatform(body.Platform) {
		return errorResponse(ctx, http.StatusBadRequest, "platform is required")
	}
	if body.BrowserContext == "" {
		return errorResponse(ctx, http.StatusBadRequest, "browser_context is required")
	}
	if len(body.Tags) == 0 {
		body.Tags = []string{}
	}

	// 状态验证
	if body.Status != 0 && body.Status != 1 {
		return errorResponse(ctx, http.StatusBadRequest, "status must be 0 or 1")
	}

	websiteLoginContext := body.ToEntity()
	if err := r.websiteLoginContext.CreateWebsiteLoginContext(ctx.UserContext(), websiteLoginContext); err != nil {
		r.l.Error(err, "http - v1 - createWebsiteLoginContext")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to create website login context")
	}

	return ctx.Status(http.StatusCreated).JSON(response.Success{
		Success: true,
		Message: "website login context created successfully",
		Data:    websiteLoginContext.ID,
	})
}

// @Summary     Update website login context
// @Description Update website login context information (only browser_context, tags, status allowed)
// @ID          update-website-login-context
// @Tags        website-login-context
// @Accept      json
// @Produce     json
// @Param       id path int64 true "Website Login Context ID"
// @Param       request body request.UpdateWebsiteLoginContext true "Website login context data"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /website_login_context/{id} [put]
func (r *V1) updateWebsiteLoginContext(ctx *fiber.Ctx) error {
	var body request.UpdateWebsiteLoginContext
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	contextID, err := ctx.ParamsInt("id")
	if err != nil || contextID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid website login context id")
	}

	websiteLoginContext := body.ToEntity()
	if len(websiteLoginContext.Tags) == 0 {
		websiteLoginContext.Tags = []string{}
	}
	websiteLoginContext.ID = int64(contextID)
	if err := r.websiteLoginContext.UpdateWebsiteLoginContext(ctx.UserContext(), websiteLoginContext); err != nil {
		r.l.Error(err, "http - v1 - updateWebsiteLoginContext")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to update website login context")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "website login context updated successfully",
		Data:    true,
	})
}

// @Summary     Delete website login context
// @Description Delete a website login context
// @ID          delete-website-login-context
// @Tags        website-login-context
// @Accept      json
// @Produce     json
// @Param       id path int64 true "Website Login Context ID"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /website_login_context/{id} [delete]
func (r *V1) deleteWebsiteLoginContext(ctx *fiber.Ctx) error {
	contextID, err := ctx.ParamsInt("id")
	if err != nil || contextID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid website login context id")
	}

	if err := r.websiteLoginContext.DeleteWebsiteLoginContext(ctx.UserContext(), int64(contextID)); err != nil {
		r.l.Error(err, "http - v1 - deleteWebsiteLoginContext")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to delete website login context")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "website login context deleted successfully",
		Data:    true,
	})
}

// @Summary     Get website login context by ID
// @Description Get website login context details by ID
// @ID          get-website-login-context
// @Tags        website-login-context
// @Accept      json
// @Produce     json
// @Param       id path int64 true "Website Login Context ID"
// @Success     200 {object} response.Success{data=entity.WebsiteLoginContext}
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /website_login_context/{id} [get]
func (r *V1) getWebsiteLoginContext(ctx *fiber.Ctx) error {
	contextID, err := ctx.ParamsInt("id")
	if err != nil || contextID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid website login context id")
	}

	websiteLoginContext, err := r.websiteLoginContext.GetWebsiteLoginContextByID(ctx.UserContext(), int64(contextID))
	if err != nil {
		r.l.Error(err, "http - v1 - getWebsiteLoginContext")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to get website login context")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "website login context retrieved successfully",
		Data:    websiteLoginContext,
	})
}

// @Summary     Get website login contexts with pagination
// @Description Get paginated website login contexts with filters
// @ID          get-website-login-contexts
// @Tags        website-login-context
// @Accept      json
// @Produce     json
// @Param       page       query    int false "Page number" default(1)
// @Param       page_size  query    int false "Page size" default(10)
// @Param       platform   query    string false "Platform filter"
// @Param       purpose    query    string false "Purpose filter"
// @Param       tag       query    string false "Tag filter" collectionFormat(multi)
// @Success     200 {object} response.Success{data=entity.WebsiteLoginContextList}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /website_login_context [get]
func (r *V1) getWebsiteLoginContexts(ctx *fiber.Ctx) error {
	page := ctx.QueryInt("page", 1)
	if page <= 0 {
		page = 1
	}

	pageSize := ctx.QueryInt("page_size", 10)
	if pageSize <= 0 {
		pageSize = 10
	}

	platform := ctx.Query("platform")
	purpose := ctx.Query("purpose")
	username := ctx.Query("username")

	tagParam := ctx.Query("tag")
	var tags []string
	if tagParam != "" {
		tags = []string{tagParam}
	}

	contextList, err := r.websiteLoginContext.GetWebsiteLoginContextsWithPage(ctx.UserContext(), platform, purpose, username, tags, page, pageSize)
	if err != nil {
		r.l.Error(err, "http - v1 - getWebsiteLoginContexts")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to get website login contexts")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "website login contexts retrieved successfully",
		Data:    contextList,
	})
}

// @Summary     Get website info
// @Description Get website info
// @ID          getWebsideInfos
// @Tags        website-infos
// @Accept      json
// @Produce     json
// @Success     200 {object} response.Success{data=request.WebsiteInfo}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /get_webside_infos [get]
func (r *V1) getWebsideInfos(ctx *fiber.Ctx) error {
	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "get website infos successfully",
		Data:    constants.WebsiteInfoMap,
	})
}
