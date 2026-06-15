package middleware

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
)

func buildRequestMessage(ctx *fiber.Ctx) string {
	var result strings.Builder

	result.WriteString(ctx.IP())
	result.WriteString(" - ")
	result.WriteString(ctx.Method())
	result.WriteString(" ")
	result.WriteString(ctx.OriginalURL())
	result.WriteString(" - ")
	result.WriteString(strconv.Itoa(ctx.Response().StatusCode()))
	result.WriteString(" ")
	// 如果是流式输出（如 SSE），跳过 Body 读取，防止缓冲或阻塞
	if strings.Contains(ctx.GetRespHeader("Content-Type"), "text/event-stream") {
		result.WriteString("[stream]")
	} else {
		result.WriteString(strconv.Itoa(len(ctx.Response().Body())))
	}

	return result.String()
}

func Logger(l logger.Interface) func(c *fiber.Ctx) error {
	return func(ctx *fiber.Ctx) error {
		err := ctx.Next()

		l.Info(buildRequestMessage(ctx))

		return err
	}
}
