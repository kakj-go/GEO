// middleware/jwt.go
package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
)

func NewJWT() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 检查是否在白名单中
		if isWhiteListed(c.Path(), config.GetConfig().Jwt.WhiteListRoutes) {
			return c.Next()
		}

		// 从 Header 中获取 token
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "缺少授权令牌",
			})
		}

		// 提取 Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "令牌格式错误",
			})
		}

		tokenString := parts[1]

		// 解析和验证 token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.GetConfig().Jwt.Secret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "无效的令牌",
			})
		}

		// 将 claims 存入上下文
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			ctx := c.UserContext()

			// 手动检查过期时间
			if exp, ok := claims[constants.Exp].(float64); ok {
				expTime := time.Unix(int64(exp), 0)
				if time.Now().After(expTime) {
					return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
						"error": "令牌已过期",
					})
				}
			} else {
				// 如果没有 exp 字段，也认为是无效的
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "令牌缺少过期时间",
				})
			}

			if userIDFloat, ok := claims[constants.UserID].(float64); ok {
				userID := int64(userIDFloat)
				ctx = context.WithValue(ctx, constants.UserID, userID)
			} else {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "令牌缺少用户名",
				})
			}

			if CompanyIDFloat, ok := claims[constants.CompanyID].(float64); ok {
				companyID := int64(CompanyIDFloat)
				ctx = context.WithValue(ctx, constants.CompanyID, companyID)
			} else {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "令牌缺少公司id",
				})
			}

			username, ok := claims[constants.Username]
			if !ok {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "令牌缺少用户名",
				})
			}

			ctx = context.WithValue(ctx, constants.Username, username)
			c.SetUserContext(ctx)
		}

		return c.Next()
	}
}

// 检查路径是否在白名单中
func isWhiteListed(path string, whiteList []string) bool {
	for _, route := range whiteList {
		if route == path {
			return true
		}
		// 支持通配符匹配，如 /v1/auth/*
		if strings.HasSuffix(route, "/*") {
			prefix := strings.TrimSuffix(route, "/*")
			if strings.HasPrefix(path, prefix) {
				return true
			}
		}
	}
	return false
}
