// Package v1 implements routing paths. Each services in own file.
package http

import (
	"fmt"
	"net/http"

	"github.com/ansrivas/fiberprometheus/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/swagger"
	"github.com/kakj-go/llm_reference_matrix/config"
	_ "github.com/kakj-go/llm_reference_matrix/docs" // Swagger docs.
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http/middleware"
	v1 "github.com/kakj-go/llm_reference_matrix/internal/controller/http/v1"
	"github.com/kakj-go/llm_reference_matrix/internal/usecase"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
)

// NewRouter -.
// Swagger spec:
// @title       Go Clean Template API
// @description Using a translation service as an example
// @version     1.0
// @host        localhost:8080
// @BasePath    /v1
func NewRouter(app *fiber.App,
	cfg *config.Config,
	user usecase.User,
	company usecase.Company,
	auth usecase.Auth,
	assetsLibrary usecase.AssetsLibrary,
	materialLibrary usecase.MaterialLibrary,
	websiteLoginContext usecase.WebsiteLoginContext,
	model usecase.Model,
	generate usecase.AIEOGenerate,
	videoJob usecase.VideoJob,
	copywriting usecase.Copywriting,
	billing usecase.Billing,
	l logger.Interface,
) {
	// Options
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "*",
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
	}))
	app.Use(middleware.Logger(l))
	app.Use(middleware.Recovery(l))
	app.Use(middleware.NewJWT())

	// 静态文件服务 - 提供图片库文件访问
	// 通过 /assets 路径访问资产库文件
	app.Static("/assets", cfg.App.AssetsLibraryPath)
	app.Static("/llm/copywriting", cfg.App.CopywritingPath)

	// Prometheus metrics
	if cfg.Metrics.Enabled {
		prometheus := fiberprometheus.New("llm_reference_matrix")
		prometheus.RegisterAt(app, "/metrics")
		app.Use(prometheus.Middleware)
	}

	// Swagger
	if cfg.Swagger.Enabled {
		app.Get("/swagger/*", swagger.HandlerDefault)
	}

	// K8s probe
	app.Get("/healthz", func(ctx *fiber.Ctx) error { return ctx.SendStatus(http.StatusOK) })

	// Routers
	apiV1Group := app.Group("/v1")
	{
		v1.NewUserRoutes(
			apiV1Group,
			user,
			company,
			auth,
			websiteLoginContext,
			assetsLibrary,
			materialLibrary,
			model,
			generate,
			videoJob,
			copywriting,
			billing,
			l,
		)
	}

	if cfg.Debug {
		PrintRoutes(app)
	}
}

func PrintRoutes(app *fiber.App) {
	routes := app.GetRoutes(true) // true 表示包含处理函数信息

	fmt.Println("")
	fmt.Println("🚀 Fiber Application Routes")
	fmt.Println("┌─────────────────────────────────────────────────────────────┐")

	for _, route := range routes {
		if route.Method == "USE" {
			continue // 跳过中间件
		}

		method := route.Method
		path := route.Path
		name := route.Name
		if name == "" {
			name = "unnamed"
		}

		fmt.Printf("│ %-6s %-40s %-20s │\n", method, path, name)
	}

	fmt.Println("└─────────────────────────────────────────────────────────────┘")
	fmt.Println("")
}
