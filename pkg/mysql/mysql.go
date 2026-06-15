// Package mysql implements mysql connection.
package mysql

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/Masterminds/squirrel"
	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
	_ "modernc.org/sqlite" // pure go sqlite
)

// Hooks 实现 sqlhooks.Hooks 接口
type Hooks struct {
	logger logger.Interface
}

// Before 在执行前调用
func (h *Hooks) Before(ctx context.Context, query string, args ...interface{}) (context.Context, error) {
	return context.WithValue(ctx, "start", time.Now()), nil
}

// After 在执行后调用
func (h *Hooks) After(ctx context.Context, query string, args ...interface{}) (context.Context, error) {
	start := ctx.Value("start").(time.Time)
	h.logger.Debug("< %s took: %s", query, time.Since(start))
	return ctx, nil
}

const (
	_defaultMaxPoolSize  = 1
	_defaultConnAttempts = 10
	_defaultConnTimeout  = time.Second
)

// MySQL -.
type MySQL struct {
	maxPoolSize  int
	connAttempts int
	connTimeout  time.Duration

	Builder squirrel.StatementBuilderType
	DB      *sql.DB
}

func getDBPath() string {
	exePath, err := os.Executable()
	if err != nil {
		return filepath.Join(".", "database", "data.db")
	}

	// Executable is in resources/backend.exe
	// We want to put db in (executable_dir)/../database/data.db
	exeDir := filepath.Dir(exePath)
	dbDir := filepath.Join(exeDir, "..", "database")

	// Ensure the directory exists
	os.MkdirAll(dbDir, os.ModePerm)

	return filepath.Join(dbDir, "data.db")
}

// New -.
func New(dsn string, logger logger.Interface, opts ...Option) (*MySQL, error) {
	mysql := &MySQL{
		maxPoolSize:  _defaultMaxPoolSize,
		connAttempts: _defaultConnAttempts,
		connTimeout:  _defaultConnTimeout,
	}

	// Custom options
	for _, opt := range opts {
		opt(mysql)
	}

	// 使用 SQLite 的占位符格式 (?)
	mysql.Builder = squirrel.StatementBuilder.PlaceholderFormat(squirrel.Question)

	var err error
	dbPath := getDBPath()
	print(dbPath)

	for mysql.connAttempts > 0 {
		var driverName = "sqlite"
		if config.GetConfig().Debug {
			// 如果启用了 debug hooks，可能需要实现一个专门的 wrapper 或者就不使用 debug hooks
			// 为了简便，这里直接用 sqlite
			driverName = "sqlite"
		}

		mysql.DB, err = sql.Open(driverName, dbPath)
		if err != nil {
			log.Printf("SQLite - failed to open connection: %v", err)
			continue
		}

		// 设置连接池参数
		mysql.DB.SetMaxOpenConns(mysql.maxPoolSize)
		mysql.DB.SetMaxIdleConns(mysql.maxPoolSize)
		mysql.DB.SetConnMaxLifetime(time.Hour)

		// 测试连接
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err = mysql.DB.PingContext(ctx)
		if err == nil {
			break
		}

		log.Printf("SQLite is trying to connect, attempts left: %d, error: %v", mysql.connAttempts, err)

		time.Sleep(mysql.connTimeout)

		mysql.connAttempts--
	}

	if err != nil {
		return nil, fmt.Errorf("sqlite - NewMySQL - connAttempts == 0: %w", err)
	}

	// 优化 SQLite：启用 WAL 模式以支持高并发现
	_, err = mysql.DB.Exec("PRAGMA journal_mode=WAL;")
	if err != nil {
		log.Printf("SQLite - PRAGMA journal_mode=WAL error: %v", err)
	}

	return mysql, nil
}

// Close -.
func (m *MySQL) Close() error {
	if m.DB != nil {
		return m.DB.Close()
	}
	return nil
}

// GetDB returns the underlying sql.DB instance.
func (m *MySQL) GetDB() *sql.DB {
	return m.DB
}
