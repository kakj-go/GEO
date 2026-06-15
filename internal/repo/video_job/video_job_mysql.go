package video_job

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

// Repo 实现 VideoJobRepo 接口
type VideoJobRepo struct {
	*mysql.MySQL
}

// NewVideoJobRepo 创建新的 VideoJobRepo 实例
func NewVideoJobRepo(db *mysql.MySQL) *VideoJobRepo {
	return &VideoJobRepo{db}
}

// CreateVideoJob 创建视频任务
func (r *VideoJobRepo) CreateVideoJob(ctx context.Context, videoJob *entity.VideoJob) error {
	now := time.Now().Unix()
	videoJob.CreatedAt = now
	videoJob.UpdatedAt = now

	sql, args, err := r.Builder.
		Insert("video_jobs").
		Columns(
			"company_id", "user_id", "title", "description", "assets_id",
			"send_status", "send_infos", "error_info", "created_at", "updated_at",
		).
		Values(
			videoJob.CompanyID, videoJob.UserID, videoJob.Title, videoJob.Description, videoJob.AssetsID,
			videoJob.SendStatus, videoJob.SendInfos, videoJob.ErrorInfo, videoJob.CreatedAt, videoJob.UpdatedAt,
		).
		ToSql()
	if err != nil {
		return fmt.Errorf("VideoJobRepo - CreateVideoJob - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("VideoJobRepo - CreateVideoJob - r.DB.Exec: %w", err)
	}

	// 获取自增ID
	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("VideoJobRepo - CreateVideoJob - result.LastInsertId: %w", err)
	}

	videoJob.ID = lastInsertID
	return nil
}

// GetVideoJobByID 根据ID获取视频任务
func (r *VideoJobRepo) GetVideoJobByID(ctx context.Context, id int64) (*entity.VideoJob, error) {
	var videoJob entity.VideoJob

	querySql, args, err := r.Builder.
		Select("*").
		From("video_jobs").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("VideoJobRepo - GetVideoJobByID - r.Builder: %w", err)
	}

	// 使用标准的 SQL 查询
	if err := r.DB.QueryRowContext(ctx, querySql, args...).Scan(
		&videoJob.ID, &videoJob.CompanyID, &videoJob.UserID, &videoJob.Title,
		&videoJob.Description, &videoJob.AssetsID, &videoJob.SendStatus, &videoJob.SendInfos,
		&videoJob.ErrorInfo, &videoJob.CreatedAt, &videoJob.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("VideoJobRepo - GetVideoJobByID - r.DB.QueryRow: %w", err)
	}

	return &videoJob, nil
}

// UpdateVideoJobSendStatus 更新视频任务收录状态
func (r *VideoJobRepo) UpdateVideoJobSendStatus(ctx context.Context, id int64, sendStatus string, errorLog string, sendInfos entity.VideoSendInfos) error {
	now := time.Now().Unix()

	sql, args, err := r.Builder.
		Update("video_jobs").
		Set("send_status", sendStatus).
		Set("send_infos", sendInfos).
		Set("error_info", errorLog).
		Set("updated_at", now).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("VideoJobRepo - UpdateVideoJobSendStatus - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("VideoJobRepo - UpdateVideoJobSendStatus - r.DB.Exec: %w", err)
	}

	return nil
}

// GetVideoJobsWithPage 分页查询视频任务列表
func (r *VideoJobRepo) GetVideoJobsWithPage(ctx context.Context, companyID int64, title string, sendStatus string, assetsID int64, page, pageSize uint64) ([]*entity.VideoJob, int, error) {
	// 构建查询
	query := r.Builder.Select("*").From("video_jobs")
	countQuery := r.Builder.Select("COUNT(*)").From("video_jobs")

	// 添加查询条件
	if companyID != 0 {
		query = query.Where("company_id = ?", companyID)
		countQuery = countQuery.Where("company_id = ?", companyID)
	}

	if title != "" {
		query = query.Where("title LIKE ?", "%"+title+"%")
		countQuery = countQuery.Where("title LIKE ?", "%"+title+"%")
	}

	if sendStatus != "" {
		query = query.Where("send_status = ?", sendStatus)
		countQuery = countQuery.Where("send_status = ?", sendStatus)
	}
	if assetsID != 0 {
		query = query.Where("assets_id = ?", assetsID)
		countQuery = countQuery.Where("assets_id = ?", assetsID)
	}

	// 计算总数
	countSql, countArgs, err := countQuery.ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("VideoJobRepo - GetVideoJobsWithPage - countQuery: %w", err)
	}

	var total int
	if err := r.DB.QueryRowContext(ctx, countSql, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("VideoJobRepo - GetVideoJobsWithPage - countQuery: %w", err)
	}

	// 分页
	offset := (page - 1) * pageSize
	query = query.OrderBy("created_at DESC").Limit(pageSize).Offset(offset)

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("VideoJobRepo - GetVideoJobsWithPage - query: %w", err)
	}

	// 使用标准的 SQL 查询
	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("VideoJobRepo - GetVideoJobsWithPage - r.DB.Query: %w", err)
	}
	defer rows.Close()

	var videoJobs []*entity.VideoJob
	for rows.Next() {
		var videoJob entity.VideoJob
		err = rows.Scan(
			&videoJob.ID, &videoJob.CompanyID, &videoJob.UserID, &videoJob.Title,
			&videoJob.Description, &videoJob.AssetsID, &videoJob.SendStatus, &videoJob.SendInfos,
			&videoJob.ErrorInfo, &videoJob.CreatedAt, &videoJob.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("VideoJobRepo - GetVideoJobsWithPage - rows.Scan: %w", err)
		}
		videoJobs = append(videoJobs, &videoJob)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("VideoJobRepo - GetVideoJobsWithPage - rows.Err: %w", err)
	}

	return videoJobs, total, nil
}

// CountVideoJobs 统计视频任务数量
func (r *VideoJobRepo) CountVideoJobs(ctx context.Context, companyID int64, sendStatus string) (int64, error) {
	query := r.Builder.Select("COUNT(*)").From("video_jobs")
	if companyID != 0 {
		query = query.Where("company_id = ?", companyID)
	}
	if sendStatus != "" {
		query = query.Where("send_status = ?", sendStatus)
	}

	sql, args, err := query.ToSql()
	if err != nil {
		return 0, fmt.Errorf("VideoJobRepo - CountVideoJobs - query: %w", err)
	}

	var count int64
	if err := r.DB.QueryRowContext(ctx, sql, args...).Scan(&count); err != nil {
		return 0, fmt.Errorf("VideoJobRepo - CountVideoJobs - scan: %w", err)
	}

	return count, nil
}
