package v1

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	copywritingCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/copywriting"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
)

// ======================== Session 路由 ========================

// createCopywritingSession 创建会话
func (r *V1) createCopywritingSession(ctx *fiber.Ctx) error {
	type CreateRequest struct {
		Title   string `json:"title"`
		ModelID string `json:"model_id"`
		Mode    string `json:"mode"`
	}

	var req CreateRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "请求参数无效",
		})
	}

	userID := ctx.UserContext().Value(constants.UserID).(int64)
	companyID := ctx.UserContext().Value(constants.CompanyID).(int64)

	session := &entity.CopywritingSession{
		Title:     req.Title,
		CompanyID: companyID,
		UserID:    userID,
		ModelID:   req.ModelID,
		Mode:      req.Mode,
	}

	if err := r.copywriting.CreateSession(ctx.Context(), session); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    session,
	})
}

// getCopywritingSessions 获取会话列表
func (r *V1) getCopywritingSessions(ctx *fiber.Ctx) error {
	userID := ctx.UserContext().Value(constants.UserID).(int64)
	companyID := ctx.UserContext().Value(constants.CompanyID).(int64)
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.Query("page_size", "50"))

	list, err := r.copywriting.GetSessions(ctx.Context(), companyID, userID, page, pageSize)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    list,
	})
}

// getCopywritingSession 获取单个会话
func (r *V1) getCopywritingSession(ctx *fiber.Ctx) error {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "无效的ID",
		})
	}

	session, err := r.copywriting.GetSessionByID(ctx.Context(), id)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "会话不存在",
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    session,
	})
}

// deleteCopywritingSession 删除会话
func (r *V1) deleteCopywritingSession(ctx *fiber.Ctx) error {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "无效的ID",
		})
	}

	if err := r.copywriting.DeleteSession(ctx.Context(), id); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"message": "删除成功",
	})
}

// ======================== SSE 流式对话 ========================

// copywritingChatStream SSE 流式对话
func (r *V1) copywritingChatStream(ctx *fiber.Ctx) error {
	type ChatRequest struct {
		Message     string                 `json:"message"`
		ModelID     string                 `json:"model_id"`
		Mode        string                 `json:"mode"`
		CompanyInfo string                 `json:"company_info"`
		References  []entity.ReferenceItem `json:"references"`
	}

	var req ChatRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "请求参数无效",
		})
	}

	if req.Message == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "消息内容不能为空",
		})
	}

	sessionID, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "无效的会话ID",
		})
	}

	userID := ctx.UserContext().Value(constants.UserID).(int64)
	companyID := ctx.UserContext().Value(constants.CompanyID).(int64)

	// Set SSE headers
	ctx.Status(fiber.StatusOK)
	ctx.Set("Content-Type", "text/event-stream")
	ctx.Set("Cache-Control", "no-cache, no-transform")
	ctx.Set("Connection", "keep-alive")
	ctx.Set("X-Accel-Buffering", "no")
	ctx.Set("X-Content-Type-Options", "nosniff")

	fctx := ctx.Context()
	fctx.SetBodyStreamWriter(func(w *bufio.Writer) {
		// 发送一些填充数据和空注释，强制刷新 Header 并绕过可能的代理缓冲
		fmt.Fprintf(w, ": %s\n\n", strings.Repeat(" ", 1024))
		w.Flush()

		err := r.copywriting.ChatStream(
			context.Background(),
			sessionID,
			req.Message,
			req.ModelID,
			req.Mode,
			companyID,
			userID,
			req.CompanyInfo,
			req.References,
			func(chunk interface{}) error {
				data, err := json.Marshal(chunk)
				if err != nil {
					return err
				}
				_, err = fmt.Fprintf(w, "data: %s\n\n", string(data))
				if err != nil {
					return err
				}
				return w.Flush()
			},
		)
		if err != nil {
			r.l.Error(fmt.Errorf("copywritingChatStream error: %w", err))
			errorData, _ := json.Marshal(copywritingCase.StreamChunk{
				Type:    "error",
				Content: err.Error(),
			})
			fmt.Fprintf(w, "data: %s\n\n", string(errorData))
			w.Flush()
		}
		fmt.Fprintf(w, "data: [DONE]\n\n")
		w.Flush()
	})

	return nil
}

// ======================== File 路由 ========================

// getCopywritingFilesBySession 获取会话关联文件
func (r *V1) getCopywritingFilesBySession(ctx *fiber.Ctx) error {
	sessionID, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "无效的会话ID",
		})
	}

	files, err := r.copywriting.GetFilesBySessionID(ctx.Context(), sessionID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    files,
	})
}

// getCopywritingFile 获取单个文件
func (r *V1) getCopywritingFile(ctx *fiber.Ctx) error {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "无效的文件ID",
		})
	}

	file, err := r.copywriting.GetFileByID(ctx.Context(), id)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "文件不存在",
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    file,
	})
}

// updateCopywritingFile 更新文件内容
func (r *V1) updateCopywritingFile(ctx *fiber.Ctx) error {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "无效的文件ID",
		})
	}

	type UpdateRequest struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	}

	var req UpdateRequest
	if err := ctx.BodyParser(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "请求参数无效",
		})
	}

	file, err := r.copywriting.GetFileByID(ctx.Context(), id)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "文件不存在",
		})
	}

	if req.Title != "" {
		file.Title = req.Title
	}
	if req.Content != "" {
		file.Content = req.Content
	}
	file.Version++

	if err := r.copywriting.UpdateFile(ctx.Context(), file); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    file,
	})
}

// getCopywritingFiles 获取所有方案文件
func (r *V1) getCopywritingFiles(ctx *fiber.Ctx) error {
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.Query("page_size", "20"))

	userID := ctx.UserContext().Value(constants.UserID).(int64)
	companyID := ctx.UserContext().Value(constants.CompanyID).(int64)
	title := ctx.Query("title")

	files, err := r.copywriting.GetFiles(ctx.Context(), companyID, userID, title, page, pageSize)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    files,
	})
}

// deleteCopywritingFile 删除文件 (软删除)
func (r *V1) deleteCopywritingFile(ctx *fiber.Ctx) error {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "无效的文件ID",
		})
	}

	if err := r.copywriting.DeleteFile(ctx.Context(), id); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"message": "删除成功",
	})
}

// recoverCopywritingFile 恢复文件 (撤销软删除)
func (r *V1) recoverCopywritingFile(ctx *fiber.Ctx) error {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "无效的文件ID",
		})
	}

	if err := r.copywriting.RecoverFile(ctx.Context(), id); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"message": "恢复成功",
	})
}

// downloadCopywritingFile 下载文件 (markdown)
func (r *V1) downloadCopywritingFile(ctx *fiber.Ctx) error {
	id, err := strconv.ParseInt(ctx.Params("id"), 10, 64)
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "无效的文件ID",
		})
	}

	file, err := r.copywriting.GetFileByID(ctx.Context(), id)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "文件不存在",
		})
	}

	fileName := file.Title + ".md"
	ctx.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	ctx.Set("Content-Type", "text/markdown; charset=utf-8")

	return ctx.SendString(file.Content)
}

// getCopywritingSkills 获取可用 skills
func (r *V1) getCopywritingSkills(ctx *fiber.Ctx) error {
	// Access skills through the copywriting usecase's concrete type
	type skillInfo struct {
		Name        string   `json:"name"`
		Keywords    []string `json:"keywords"`
		Description string   `json:"description"`
	}

	skills := []skillInfo{
		{Name: "企业策划", Keywords: []string{"企业策划", "商业计划", "创业方案"}, Description: "适用于企业策划方案的专业模板"},
		{Name: "营销推广", Keywords: []string{"营销", "推广", "运营", "品牌"}, Description: "适用于营销推广方案的专业模板"},
		{Name: "通用方案", Keywords: []string{}, Description: "通用方案设计模板，适用于任何类型的方案"},
	}

	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    skills,
	})
}
