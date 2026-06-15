package v1

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
)

// @Summary     Get user details
// @Description Get user details by ID
// @ID          get-user
// @Tags        user
// @Accept      json
// @Produce     json
// @Success     200 {object} response.Success{data=entity.User}
// @Failure     400 {object} response.Error
// @Failure     404 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /user_info [get]
func (r *V1) getUserInfo(ctx *fiber.Ctx) error {
	user, err := r.user.GetUserInfo(ctx.UserContext())
	if err != nil {
		r.l.Error(err, "http - v1 - getUserInfo")
		return errorResponse(ctx, http.StatusInternalServerError, "获取用户详情失败")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "user retrieved successfully",
		Data:    user,
	})
}

// @Description Get paginated users by company ID
// @ID          get-users-by-company
// @Tags  	    user
// @Accept      json
// @Produce     json
// @Param       page       query    int false "Page number" default(1)
// @Param       page_size  query    int false "Page size" default(10)
// @Success     200 {object} response.Success{data=entity.User}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /user/company/{company_id} [get]
func (r *V1) getUsersByCompany(ctx *fiber.Ctx) error {
	page := ctx.QueryInt("page", 1)
	if page <= 0 {
		page = 1
	}

	pageSize := ctx.QueryInt("page_size", 10)
	if pageSize <= 0 {
		pageSize = 10
	}
	name := ctx.Query("name")
	phone := ctx.Query("phone")

	userList, err := r.user.GetUsersByCompany(ctx.UserContext(), ctx.UserContext().Value(constants.CompanyID).(int64), name, phone, page, pageSize)
	if err != nil {
		r.l.Error(err, "http - v1 - getUsersByCompany")
		return errorResponse(ctx, http.StatusInternalServerError, "database problems")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Data:    userList,
	})
}

// @Summary     Create user
// @Description Create a new user
// @ID          create-user
// @Tags  	    user
// @Accept      json
// @Produce     json
// @Param       request body     request.CreateUser true "User data"
// @Success     201 {object} response.Success{data=int}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /user [post]
func (r *V1) createUser(ctx *fiber.Ctx) error {
	var body request.CreateUser
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	if body.Passwd != "" && !request.IsValidPassword(body.Passwd) {
		return errorResponse(ctx, http.StatusBadRequest, "invalid user password")
	}
	if !request.IsValidNickname(body.Nickname) {
		return errorResponse(ctx, http.StatusBadRequest, "invalid user nickname")
	}
	if !request.IsValidPhone(body.Phone) {
		return errorResponse(ctx, http.StatusBadRequest, "invalid user phone")
	}
	if !request.IsValidUsername(body.Username) {
		return errorResponse(ctx, http.StatusBadRequest, "invalid user username")
	}

	user := body.ToEntity()
	if err := r.user.CreateUser(ctx.UserContext(), user); err != nil {
		r.l.Error(err, "http - v1 - createUser")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to create user. error: "+err.Error())
	}

	return ctx.Status(http.StatusCreated).JSON(response.Success{
		Success: true,
		Message: "user created successfully",
		Data:    user.ID,
	})
}

// @Summary     Update user
// @Description Update user information
// @ID          update-user
// @Tags  	    user
// @Accept      json
// @Produce     json
// @Param       request body request.UpdateUser true "User data"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /user/{id} [put]
func (r *V1) updateUser(ctx *fiber.Ctx) error {
	var body request.UpdateUser
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	userID, err := ctx.ParamsInt("id")
	if err != nil || userID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid user id")
	}

	if body.Passwd != "" {
		if !request.IsValidPassword(body.Passwd) {
			return errorResponse(ctx, http.StatusBadRequest, "invalid user password")
		}
	}

	if !request.IsValidNickname(body.Nickname) {
		return errorResponse(ctx, http.StatusBadRequest, "invalid user nickname")
	}
	if !request.IsValidPhone(body.Phone) {
		return errorResponse(ctx, http.StatusBadRequest, "invalid user phone")
	}

	user := body.ToEntity()
	user.ID = int64(userID)
	if err := r.user.UpdateUser(ctx.UserContext(), user); err != nil {
		r.l.Error(err, "http - v1 - updateUser")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to update user")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "user updated successfully",
		Data:    true,
	})
}

// @Summary     Delete user
// @Description Soft delete a user
// @ID          delete-user
// @Tags  	    user
// @Accept      json
// @Produce     json
// @Param       id path int true "User ID"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /user/{id} [delete]
func (r *V1) deleteUser(ctx *fiber.Ctx) error {
	userID, err := ctx.ParamsInt("id")
	if err != nil || userID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid user id")
	}

	if err := r.user.DeleteUser(ctx.UserContext(), int64(userID)); err != nil {
		r.l.Error(err, "http - v1 - deleteUser")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to delete user")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "user deleted successfully",
		Data:    true,
	})
}

// @Summary     Check phone exists
// @Description Check if a phone number already exists in the system
// @ID          check-phone-exists
// @Tags  	    user
// @Accept      json
// @Produce     json
// @Param       phone query string true "Phone number to check"
// @Param       exclude_id query int false "User ID to exclude from check"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /user/check_phone [get]
func (r *V1) checkPhoneExists(ctx *fiber.Ctx) error {
	phone := ctx.Query("phone")
	if phone == "" {
		return errorResponse(ctx, http.StatusBadRequest, "phone parameter is required")
	}

	exists, err := r.user.CheckPhoneExists(ctx.UserContext(), phone)
	if err != nil {
		r.l.Error(err, "http - v1 - checkPhoneExists")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to check phone existence")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "check phone existence completed",
		Data:    exists,
	})
}

// @Summary     Check username exists
// @Description Check if a username already exists in the system
// @ID          check-username-exists
// @Tags  	    user
// @Accept      json
// @Produce     json
// @Param       username query string true "Username to check"
// @Success     200 {object} response.Success{data=bool}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /user/check_username [get]
func (r *V1) checkUsernameExists(ctx *fiber.Ctx) error {
	username := ctx.Query("username")
	if username == "" {
		return errorResponse(ctx, http.StatusBadRequest, "username parameter is required")
	}

	exists, err := r.user.CheckUsernameExists(ctx.UserContext(), username)
	if err != nil {
		r.l.Error(err, "http - v1 - checkUsernameExists")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to check username existence")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "check username existence completed",
		Data:    exists,
	})
}
