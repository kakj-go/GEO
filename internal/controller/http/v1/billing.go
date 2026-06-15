package v1

import (
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1/response"
)

func (v *V1) getTransactions(c *fiber.Ctx) error {
	companyID, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))

	res, err := v.billing.GetTransactions(c.Context(), companyID, page, pageSize)
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Data:    res,
	})
}

func (v *V1) getUsageLogs(c *fiber.Ctx) error {
	companyID, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	modelID := c.Query("model_id")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))

	res, err := v.billing.GetUsageLogs(c.Context(), companyID, modelID, page, pageSize)
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Data:    res,
	})
}

func (v *V1) directRecharge(c *fiber.Ctx) error {
	companyID, _ := strconv.ParseInt(c.Params("id"), 10, 64)

	type RechargeReq struct {
		Amount        int64  `json:"amount"`
		UserID        int64  `json:"user_id"`
		PaymentMethod string `json:"payment_method"`
		Remark        string `json:"remark"`
	}

	var req RechargeReq
	if err := c.BodyParser(&req); err != nil {
		return errorResponse(c, http.StatusBadRequest, "Invalid request body")
	}

	err := v.billing.DirectRecharge(c.Context(), companyID, req.UserID, req.Amount, req.PaymentMethod, req.Remark)
	if err != nil {
		return errorResponse(c, http.StatusInternalServerError, err.Error())
	}

	return c.JSON(response.Success{
		Success: true,
		Data:    "Recharge success",
	})
}
