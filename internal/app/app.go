// Package app configures and runs application.
package app

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/kakj-go/llm_reference_matrix/migrations"

	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/internal/controller/http"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/aieo_generate"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/assets_library"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/billing"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/company"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/copywriting"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/material_library"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/model"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/user"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/video_job"
	"github.com/kakj-go/llm_reference_matrix/internal/repo/website_login_context"
	aieoGenerateCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/aieo_generate"
	assetsLibraryCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/assets_library"
	authCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/auth"
	billingCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/billing"
	companyCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/company"
	copywritingCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/copywriting"
	materialLibraryCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/material_library"
	modelCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/model"
	userCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/user"
	jobCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/video_job"
	websiteLoginContextCase "github.com/kakj-go/llm_reference_matrix/internal/usecase/website_login_context"
	"github.com/kakj-go/llm_reference_matrix/pkg/httpserver"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

// Run creates objects via constructors.
func Run(cfg *config.Config) {
	l := logger.New(cfg.Log.Level)

	// Repository
	mysql, err := mysql.New(cfg.Mysql.URL, l, mysql.WithMaxPoolSize(cfg.Mysql.PoolMax))
	if err != nil {
		l.Fatal(fmt.Errorf("app - Run - postgres.New: %w", err))
	}
	defer mysql.Close()

	// Run migrations
	d, err := iofs.New(migrations.FS, ".")
	if err != nil {
		l.Fatal(fmt.Errorf("failed to load migrations from iofs: %w", err))
	}
	driver, err := sqlite.WithInstance(mysql.DB, &sqlite.Config{})
	if err != nil {
		l.Fatal(fmt.Errorf("failed to create sqlite driver: %w", err))
	}
	m, err := migrate.NewWithInstance("iofs", d, "sqlite", driver)
	if err != nil {
		l.Fatal(fmt.Errorf("failed to initialze migrate instance: %w", err))
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		l.Error(fmt.Errorf("migration run failed: %w", err))
	} else {
		l.Info("migration run success or no changes")
	}

	// reps
	userRepo := user.NewUserRepo(mysql)
	companyRepo := company.NewCompanyRepo(mysql)
	websiteLoginContextRepo := website_login_context.NewWebsiteLoginContextRepo(mysql)
	assetsLibraryRepo := assets_library.NewAssetsLibraryRepo(mysql)
	materialLibraryRepo := material_library.NewMaterialLibraryRepo(mysql)
	modelRepo := model.NewModelRepo(mysql)
	generateRepo := aieo_generate.NewAIEOGenerateRepo(mysql)
	videoJobRepo := video_job.NewVideoJobRepo(mysql)
	copywritingRepo := copywriting.NewCopywritingRepo(mysql)
	billingRepo := billing.New(mysql)

	billingUserCase := billingCase.New(
		billingRepo,
		companyRepo,
		modelRepo,
		l,
	)

	// user cases
	userUserCase := userCase.New(
		userRepo,
		companyRepo,
	)
	companyUserCase := companyCase.New(
		companyRepo,
		userRepo,
	)
	authUserCase := authCase.New(
		userRepo,
		companyRepo,
		modelRepo,
	)
	websiteLoginContextUserCase := websiteLoginContextCase.New(
		websiteLoginContextRepo,
	)
	assetsLibraryUserCase := assetsLibraryCase.New(
		assetsLibraryRepo,
	)
	materialLibraryUserCase := materialLibraryCase.New(
		materialLibraryRepo,
	)
	modelUserCase := modelCase.New(
		modelRepo,
	)
	generateUserCase := aieoGenerateCase.New(
		generateRepo,
		modelRepo,
		assetsLibraryRepo,
		materialLibraryRepo,
		websiteLoginContextRepo,
		videoJobRepo,
		companyRepo,
		billingUserCase,
		l,
	)
	videoJobUserCase := jobCase.New(
		videoJobRepo,
		websiteLoginContextRepo,
		assetsLibraryRepo,
		l,
	)
	copywritingUserCase := copywritingCase.New(
		copywritingRepo,
		modelRepo,
		companyRepo,
		billingUserCase,
		l,
	)

	// HTTP Server
	httpServer := httpserver.New(l, httpserver.Port(cfg.HTTP.Port), httpserver.Prefork(cfg.HTTP.UsePreforkMode))
	http.NewRouter(httpServer.App,
		cfg,
		userUserCase,
		companyUserCase,
		authUserCase,
		assetsLibraryUserCase,
		materialLibraryUserCase,
		websiteLoginContextUserCase,
		modelUserCase,
		generateUserCase,
		videoJobUserCase,
		copywritingUserCase,
		billingUserCase,
		l,
	)

	// Start servers
	httpServer.Start()

	// Waiting signal
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGTERM)

	select {
	case s := <-interrupt:
		l.Info("app - Run - signal: %s", s.String())
	case err = <-httpServer.Notify():
		l.Error(fmt.Errorf("app - Run - httpServer.Notify: %w", err))
	}

	// Shutdown
	err = httpServer.Shutdown()
	if err != nil {
		l.Error(fmt.Errorf("app - Run - httpServer.Shutdown: %w", err))
	}
}
