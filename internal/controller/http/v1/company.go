package v1

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/request"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
)

// @Summary     Get company by ID
// @Description Get company details by company ID
// @ID          get-company-by-id
// @Tags        company
// @Accept      json
// @Produce     json
// @Param       id path int true "Company ID"
// @Success     200 {object} response.Success{data=entity.Company}
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /company/{id} [get]
func (r *V1) getCompanyByID(ctx *fiber.Ctx) error {
	id, err := ctx.ParamsInt("id")
	if err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid company ID")
	}

	company, err := r.company.GetCompanyByID(ctx.UserContext(), int64(id))
	if err != nil {
		r.l.Error(err, "http - v1 - getCompanyByID")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to get company")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "get company completed",
		Data:    company,
	})
}

// @Summary     Get APIMart API key
// @Description Get the current company's shared APIMart API key
// @ID          get-apimart-key
// @Tags        model
// @Produce     json
// @Success     200 {object} response.Success
// @Failure     500 {object} response.Error
// @Router      /model/apimart_key [get]
func (r *V1) getApimartKey(ctx *fiber.Ctx) error {
	key, err := r.company.GetAPIMartApiKey(ctx.UserContext())
	if err != nil {
		r.l.Error(err, "http - v1 - getApimartKey")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to get apimart api key")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "get apimart api key completed",
		Data:    fiber.Map{"api_key": key},
	})
}

// @Summary     Set APIMart API key
// @Description Set the current company's shared APIMart API key
// @ID          set-apimart-key
// @Tags        model
// @Accept      json
// @Produce     json
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /model/apimart_key [put]
func (r *V1) setApimartKey(ctx *fiber.Ctx) error {
	var body struct {
		ApiKey string `json:"api_key"`
	}
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	if err := r.company.SetAPIMartApiKey(ctx.UserContext(), body.ApiKey); err != nil {
		r.l.Error(err, "http - v1 - setApimartKey")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to set apimart api key")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "apimart api key updated",
	})
}

// @Summary     Create company
// @Description Create a new company
// @ID          create-company
// @Tags        company
// @Accept      json
// @Produce     json
// @Param       company body request.CreateCompany true "Company data"
// @Success     201 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /company [post]
func (r *V1) createCompany(ctx *fiber.Ctx) error {
	var body request.CreateCompany
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	company := body.ToEntity()
	if err := r.company.CreateCompany(ctx.UserContext(), company); err != nil {
		r.l.Error(err, "http - v1 - createCompany")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to create company")
	}

	return ctx.Status(http.StatusCreated).JSON(response.Success{
		Success: true,
		Message: "company created successfully",
		Data:    company,
	})
}

// @Summary     Update company
// @Description Update company information
// @ID          update-company
// @Tags        company
// @Accept      json
// @Produce     json
// @Param       id path int true "Company ID"
// @Param       company body request.UpdateCompany true "Company data"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /company/{id} [put]
func (r *V1) updateCompany(ctx *fiber.Ctx) error {
	id, err := ctx.ParamsInt("id")
	if err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid company ID")
	}

	var body request.UpdateCompany
	if err := ctx.BodyParser(&body); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}
	company := body.ToEntity()

	company.ID = int64(id)
	if err := r.company.UpdateCompany(ctx.UserContext(), company); err != nil {
		r.l.Error(err, "http - v1 - updateCompany")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to update company")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "company updated successfully",
		Data:    company,
	})
}

// @Summary     Add company balance
// @Description Add balance to company account
// @ID          add-company-balance
// @Tags        company
// @Accept      json
// @Produce     json
// @Param       id path int true "Company ID"
// @Param       request body request.AddCompanyBalanceRequest true "Balance to add"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /company/{id}/balance/add [post]
func (r *V1) addCompanyBalance(ctx *fiber.Ctx) error {
	id, err := ctx.ParamsInt("id")
	if err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid company ID")
	}

	var req request.AddCompanyBalanceRequest
	if err := ctx.BodyParser(&req); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	if req.Balance <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "balance must be positive")
	}

	if err := r.company.AddCompanyBalance(ctx.UserContext(), int64(id), req.Balance); err != nil {
		r.l.Error(err, "http - v1 - addCompanyBalance")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to add company balance")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "company balance added successfully",
		Data:    nil,
	})
}

// @Summary     Delete company balance
// @Description Delete balance from company account
// @ID          delete-company-balance
// @Tags        company
// @Accept      json
// @Produce     json
// @Param       id path int true "Company ID"
// @Param       request body request.DeleteCompanyBalanceRequest true "Balance to delete"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /company/{id}/balance/delete [post]
func (r *V1) deleteCompanyBalance(ctx *fiber.Ctx) error {
	id, err := ctx.ParamsInt("id")
	if err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid company ID")
	}

	var req request.DeleteCompanyBalanceRequest
	if err := ctx.BodyParser(&req); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	if req.Balance <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "balance must be positive")
	}

	if err := r.company.DeleteCompanyBalance(ctx.UserContext(), int64(id), req.Balance); err != nil {
		r.l.Error(err, "http - v1 - deleteCompanyBalance")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to delete company balance")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "company balance deleted successfully",
		Data:    nil,
	})
}

// @Summary     Change company manager
// @Description Change manager user ID for a company
// @ID          change-company-manager
// @Tags        company
// @Accept      json
// @Produce     json
// @Param       id path int true "Company ID"
// @Param       request body request.ChangeManagerRequest true "New manager user ID"
// @Success     200 {object} response.Success
// @Failure     400 {object} response.Error
// @Failure     500 {object} response.Error
// @Router      /company/{id}/manager [put]
func (r *V1) changeManagerUserID(ctx *fiber.Ctx) error {
	id, err := ctx.ParamsInt("id")
	if err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid company ID")
	}

	var req request.ChangeManagerRequest
	if err := ctx.BodyParser(&req); err != nil {
		return errorResponse(ctx, http.StatusBadRequest, "invalid request body")
	}

	if req.ManagerUserID <= 0 {
		return errorResponse(ctx, http.StatusBadRequest, "invalid manager user ID")
	}

	if err := r.company.ChangeManagerUserID(ctx.UserContext(), int64(id), req.ManagerUserID); err != nil {
		r.l.Error(err, "http - v1 - changeManagerUserID")
		return errorResponse(ctx, http.StatusInternalServerError, "failed to change company manager")
	}

	return ctx.Status(http.StatusOK).JSON(response.Success{
		Success: true,
		Message: "company manager changed successfully",
		Data:    nil,
	})
}
