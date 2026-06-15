package aieo_generate

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

// Repo 实现 AIEOGenerateRepo 接口
type AIEOGenerateRepo struct {
	*mysql.MySQL
}

// NewAIEOGenerateRepo 创建新的 AIEOGenerateRepo 实例
func NewAIEOGenerateRepo(db *mysql.MySQL) *AIEOGenerateRepo {
	return &AIEOGenerateRepo{db}
}

// CreateAIEOGenerate 创建AIEO生成任务
func (r *AIEOGenerateRepo) CreateAIEOGenerate(ctx context.Context, generate *entity.AIEOGenerate) error {
	now := time.Now().Unix()
	generate.CreatedAt = now
	generate.UpdatedAt = now

	sql, args, err := r.Builder.
		Insert("aieo_generates").
		Columns(
			"company_id", "user_id", "name", "keyword", "target_word", "type", "platform",
			"user_questions", "image_library_id_list", "material_library_id_list",
			"create_num", "contents", "status", "send_status", "send_infos", "error_info",
			"created_at", "updated_at",
		).
		Values(
			generate.CompanyID, generate.UserID, generate.Name, generate.Keyword, generate.TargetWord, generate.Type, generate.Platform,
			generate.UserQuestions, generate.ImageLibraryIDList, generate.MaterialLibraryIDList,
			generate.CreateNum, generate.Contents, generate.Status, generate.SendStatus, generate.SendInfos, generate.ErrorInfo,
			generate.CreatedAt, generate.UpdatedAt,
		).
		ToSql()
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - CreateAIEOGenerate - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - CreateAIEOGenerate - r.DB.Exec: %w", err)
	}

	// 获取自增ID
	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - CreateAIEOGenerate - result.LastInsertId: %w", err)
	}

	generate.ID = lastInsertID
	return nil
}

// GetAIEOGenerateByID 根据ID获取AIEO生成任务
func (r *AIEOGenerateRepo) GetAIEOGenerateByID(ctx context.Context, id int64) (*entity.AIEOGenerate, error) {
	var generate entity.AIEOGenerate

	querySql, args, err := r.Builder.
		Select(
			"id", "company_id", "user_id", "name",
			"keyword", "target_word", "user_questions", "type",
			"image_library_id_list", "material_library_id_list", "create_num", "platform",
			"contents", "status", "send_status", "send_infos", "error_info",
			"created_at", "updated_at",
		).
		From("aieo_generates").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("AIEOGenerateRepo - GetAIEOGenerateByID - r.Builder: %w", err)
	}

	// 使用标准的 SQL 查询替代 pgxscan
	if err := r.DB.QueryRowContext(ctx, querySql, args...).Scan(
		&generate.ID, &generate.CompanyID, &generate.UserID, &generate.Name,
		&generate.Keyword, &generate.TargetWord, &generate.UserQuestions, &generate.Type,
		&generate.ImageLibraryIDList, &generate.MaterialLibraryIDList, &generate.CreateNum, &generate.Platform,
		&generate.Contents, &generate.Status, &generate.SendStatus, &generate.SendInfos, &generate.ErrorInfo,
		&generate.CreatedAt, &generate.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("AIEOGenerateRepo - GetAIEOGenerateByID - r.DB.QueryRow: %w", err)
	}

	return &generate, nil
}

// UpdateAIEOGenerateContent 更新AIEO生成任务的创作内容
func (r *AIEOGenerateRepo) UpdateAIEOGenerateContent(ctx context.Context, id int64, content entity.AIEOGenerateContents) error {
	now := time.Now().Unix()

	sql, args, err := r.Builder.
		Update("aieo_generates").
		Set("contents", content).
		Set("updated_at", now).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - UpdateAIEOGenerateContent - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - UpdateAIEOGenerateContent - r.DB.Exec: %w", err)
	}

	return nil
}

// UpdateAIEOGenerateStatus 更新AIEO生成任务状态
func (r *AIEOGenerateRepo) UpdateAIEOGenerateStatus(ctx context.Context, id int64, status string, errorLog string) error {
	now := time.Now().Unix()

	sql, args, err := r.Builder.
		Update("aieo_generates").
		Set("status", status).
		Set("error_info", errorLog).
		Set("updated_at", now).
		Where("id = ? and status = 'Running'", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - UpdateAIEOGenerateStatus - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - UpdateAIEOGenerateStatus - r.DB.Exec: %w", err)
	}

	return nil
}

// DeleteAIEOGenerate 删除AIEO生成任务
func (r *AIEOGenerateRepo) DeleteAIEOGenerate(ctx context.Context, id int64) error {
	sql, args, err := r.Builder.
		Delete("aieo_generates").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - DeleteAIEOGenerate - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - DeleteAIEOGenerate - r.DB.Exec: %w", err)
	}

	return nil
}

// GetAIEOGeneratesWithPage 分页查询AIEO生成任务列表，不返回创作内容
func (r *AIEOGenerateRepo) GetAIEOGeneratesWithPage(ctx context.Context, companyID int64, name, keyword string, status string, sendStatus string, withContent bool, page, pageSize uint64) ([]*entity.AIEOGenerate, int, error) {
	// 构建查询
	// 选择字段
	selectFields := []string{
		"id", "company_id", "user_id", "name", "type", "platform", "keyword", "target_word", "user_questions",
		"image_library_id_list", "material_library_id_list", "create_num", "status", "send_status", "send_infos", "error_info", "created_at", "updated_at",
	}
	if withContent {
		selectFields = append(selectFields, "contents")
	}

	query := r.Builder.Select(selectFields...).From("aieo_generates")
	countQuery := r.Builder.Select("COUNT(*)").From("aieo_generates")

	// 添加查询条件
	if companyID != 0 {
		query = query.Where("company_id = ?", companyID)
		countQuery = countQuery.Where("company_id = ?", companyID)
	}

	if name != "" {
		query = query.Where("name LIKE ?", "%"+name+"%")
		countQuery = countQuery.Where("name LIKE ?", "%"+name+"%")
	}

	if keyword != "" {
		query = query.Where("keyword LIKE ?", "%"+keyword+"%")
		countQuery = countQuery.Where("keyword LIKE ?", "%"+keyword+"%")
	}

	if status != "" {
		query = query.Where("status = ?", status)
		countQuery = countQuery.Where("status = ?", status)
	}

	if sendStatus != "" {
		query = query.Where("send_status = ?", sendStatus)
		countQuery = countQuery.Where("send_status = ?", sendStatus)
	}

	// 处理用户问题查询（这里简化处理，实际可能需要更复杂的JSON查询）

	// 计算总数
	countSql, countArgs, err := countQuery.ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("AIEOGenerateRepo - GetAIEOGeneratesWithPage - countQuery: %w", err)
	}

	var total int
	if err := r.DB.QueryRowContext(ctx, countSql, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("AIEOGenerateRepo - GetAIEOGeneratesWithPage - countQuery: %w", err)
	}

	// 分页
	offset := (page - 1) * pageSize
	query = query.OrderBy("created_at DESC").Limit(pageSize).Offset(offset)

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("AIEOGenerateRepo - GetAIEOGeneratesWithPage - query: %w", err)
	}

	// 使用标准的 SQL 查询替代 pgxscan
	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("AIEOGenerateRepo - GetAIEOGeneratesWithPage - r.DB.Query: %w", err)
	}
	defer rows.Close()

	var generates []*entity.AIEOGenerate
	for rows.Next() {
		var generate entity.AIEOGenerate
		if withContent {
			err = rows.Scan(
				&generate.ID, &generate.CompanyID, &generate.UserID, &generate.Name, &generate.Type, &generate.Platform,
				&generate.Keyword, &generate.TargetWord, &generate.UserQuestions,
				&generate.ImageLibraryIDList, &generate.MaterialLibraryIDList, &generate.CreateNum,
				&generate.Status, &generate.SendStatus, &generate.SendInfos, &generate.ErrorInfo,
				&generate.CreatedAt, &generate.UpdatedAt, &generate.Contents,
			)
		} else {
			err = rows.Scan(
				&generate.ID, &generate.CompanyID, &generate.UserID, &generate.Name, &generate.Type, &generate.Platform,
				&generate.Keyword, &generate.TargetWord, &generate.UserQuestions,
				&generate.ImageLibraryIDList, &generate.MaterialLibraryIDList, &generate.CreateNum,
				&generate.Status, &generate.SendStatus, &generate.SendInfos, &generate.ErrorInfo,
				&generate.CreatedAt, &generate.UpdatedAt,
			)
		}
		if err != nil {
			return nil, 0, fmt.Errorf("AIEOGenerateRepo - GetAIEOGeneratesWithPage - rows.Scan: %w", err)
		}
		generates = append(generates, &generate)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("AIEOGenerateRepo - GetAIEOGeneratesWithPage - rows.Err: %w", err)
	}

	return generates, total, nil
}

// UpdateAIEOGenerateSends 更新AIEO生成任务
func (r *AIEOGenerateRepo) UpdateAIEOGenerateSends(ctx context.Context, id int64, sendStatus string, errorLog string, sendInfos entity.SendInfos) error {
	now := time.Now().Unix()

	sql, args, err := r.Builder.
		Update("aieo_generates").
		Set("send_infos", sendInfos).
		Set("send_status", sendStatus).
		Set("error_info", errorLog).
		Set("updated_at", now).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - UpdateAIEOGenerateSends - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("AIEOGenerateRepo - UpdateAIEOGenerateSends - r.DB.Exec: %w", err)
	}

	return nil
}

// CountAIEOGenerates 统计AIEO生成任务数量
func (r *AIEOGenerateRepo) CountAIEOGenerates(ctx context.Context, companyID int64, sendStatus string) (int64, error) {
	query := r.Builder.Select("COUNT(*)").From("aieo_generates")
	if companyID != 0 {
		query = query.Where("company_id = ?", companyID)
	}
	if sendStatus != "" {
		query = query.Where("send_status = ?", sendStatus)
	}

	sql, args, err := query.ToSql()
	if err != nil {
		return 0, fmt.Errorf("AIEOGenerateRepo - CountAIEOGenerates - query: %w", err)
	}

	var count int64
	if err := r.DB.QueryRowContext(ctx, sql, args...).Scan(&count); err != nil {
		return 0, fmt.Errorf("AIEOGenerateRepo - CountAIEOGenerates - scan: %w", err)
	}

	return count, nil
}
