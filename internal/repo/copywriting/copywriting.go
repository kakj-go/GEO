package copywriting

import (
	"context"
	"fmt"
	"time"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

const _defaultEntityCap = 64

// CopywritingRepo -.
type CopywritingRepo struct {
	*mysql.MySQL
}

// NewCopywritingRepo -.
func NewCopywritingRepo(db *mysql.MySQL) *CopywritingRepo {
	return &CopywritingRepo{db}
}

// ======================== Session CRUD ========================

// CreateSession 创建会话
func (r *CopywritingRepo) CreateSession(ctx context.Context, session *entity.CopywritingSession) error {
	now := time.Now().Unix()
	session.CreatedAt = now
	session.UpdatedAt = now

	sql, args, err := r.Builder.
		Insert("copywriting_sessions").
		Columns("title, company_id, user_id, model_id, mode, messages, created_at, updated_at").
		Values(session.Title, session.CompanyID, session.UserID, session.ModelID, session.Mode, session.Messages, session.CreatedAt, session.UpdatedAt).
		ToSql()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - CreateSession - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CopywritingRepo - CreateSession - r.DB.Exec: %w", err)
	}

	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - CreateSession - result.LastInsertId: %w", err)
	}

	session.ID = lastInsertID
	return nil
}

// GetSessionByID 根据ID获取会话
func (r *CopywritingRepo) GetSessionByID(ctx context.Context, id int64) (*entity.CopywritingSession, error) {
	sql, args, err := r.Builder.
		Select("id, title, company_id, user_id, model_id, mode, messages, created_at, updated_at").
		From("copywriting_sessions").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("CopywritingRepo - GetSessionByID - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sql, args...)
	session := &entity.CopywritingSession{}
	err = row.Scan(&session.ID, &session.Title, &session.CompanyID, &session.UserID,
		&session.ModelID, &session.Mode, &session.Messages, &session.CreatedAt, &session.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("CopywritingRepo - GetSessionByID - row.Scan: %w", err)
	}

	return session, nil
}

// UpdateSession 更新会话
func (r *CopywritingRepo) UpdateSession(ctx context.Context, session *entity.CopywritingSession) error {
	now := time.Now().Unix()
	session.UpdatedAt = now

	sql, args, err := r.Builder.
		Update("copywriting_sessions").
		Set("title", session.Title).
		Set("model_id", session.ModelID).
		Set("mode", session.Mode).
		Set("messages", session.Messages).
		Set("updated_at", session.UpdatedAt).
		Where("id = ?", session.ID).
		ToSql()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - UpdateSession - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CopywritingRepo - UpdateSession - r.DB.Exec: %w", err)
	}

	return nil
}

// DeleteSession 删除会话
func (r *CopywritingRepo) DeleteSession(ctx context.Context, id int64) error {
	// 先删除关联文件
	sql, args, err := r.Builder.
		Delete("copywriting_files").
		Where("session_id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - DeleteSession - delete files builder: %w", err)
	}
	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CopywritingRepo - DeleteSession - delete files exec: %w", err)
	}

	// 再删除会话
	sql, args, err = r.Builder.
		Delete("copywriting_sessions").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - DeleteSession - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CopywritingRepo - DeleteSession - r.DB.Exec: %w", err)
	}

	return nil
}

// GetSessionsWithPage 分页查询会话列表
func (r *CopywritingRepo) GetSessionsWithPage(ctx context.Context, companyID int64, userID int64, page, pageSize int) ([]*entity.CopywritingSession, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// 总数
	countSQL, countArgs, err := r.Builder.
		Select("COUNT(*)").
		From("copywriting_sessions").
		Where("company_id = ? AND user_id = ?", companyID, userID).
		ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("CopywritingRepo - GetSessionsWithPage - count builder: %w", err)
	}

	var total int
	err = r.DB.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("CopywritingRepo - GetSessionsWithPage - count query: %w", err)
	}

	// 分页数据（不返回 messages 以减少传输量）
	sql, args, err := r.Builder.
		Select("id, title, company_id, user_id, model_id, mode, created_at, updated_at").
		From("copywriting_sessions").
		Where("company_id = ? AND user_id = ?", companyID, userID).
		OrderBy("updated_at DESC").
		Limit(uint64(pageSize)).
		Offset(uint64(offset)).
		ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("CopywritingRepo - GetSessionsWithPage - r.Builder: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("CopywritingRepo - GetSessionsWithPage - r.DB.Query: %w", err)
	}
	defer rows.Close()

	sessions := make([]*entity.CopywritingSession, 0, _defaultEntityCap)
	for rows.Next() {
		session := &entity.CopywritingSession{}
		err = rows.Scan(&session.ID, &session.Title, &session.CompanyID, &session.UserID,
			&session.ModelID, &session.Mode, &session.CreatedAt, &session.UpdatedAt)
		if err != nil {
			return nil, 0, fmt.Errorf("CopywritingRepo - GetSessionsWithPage - rows.Scan: %w", err)
		}
		sessions = append(sessions, session)
	}

	return sessions, total, nil
}

// ======================== File CRUD ========================

// CreateFile 创建文件
func (r *CopywritingRepo) CreateFile(ctx context.Context, file *entity.CopywritingFile) error {
	now := time.Now().Unix()
	file.CreatedAt = now
	file.UpdatedAt = now
	file.IsDeleted = 0

	sql, args, err := r.Builder.
		Insert("copywriting_files").
		Columns("session_id, title, content, file_path, company_id, user_id, version, is_deleted, created_at, updated_at").
		Values(file.SessionID, file.Title, file.Content, file.FilePath, file.CompanyID, file.UserID, file.Version, file.IsDeleted, file.CreatedAt, file.UpdatedAt).
		ToSql()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - CreateFile - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CopywritingRepo - CreateFile - r.DB.Exec: %w", err)
	}

	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - CreateFile - result.LastInsertId: %w", err)
	}

	file.ID = lastInsertID
	return nil
}

// GetFileByID 根据ID获取文件
func (r *CopywritingRepo) GetFileByID(ctx context.Context, id int64) (*entity.CopywritingFile, error) {
	sql, args, err := r.Builder.
		Select("id, session_id, title, content, file_path, company_id, user_id, version, is_deleted, created_at, updated_at").
		From("copywriting_files").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("CopywritingRepo - GetFileByID - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sql, args...)
	file := &entity.CopywritingFile{}
	err = row.Scan(&file.ID, &file.SessionID, &file.Title, &file.Content, &file.FilePath,
		&file.CompanyID, &file.UserID, &file.Version, &file.IsDeleted, &file.CreatedAt, &file.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("CopywritingRepo - GetFileByID - row.Scan: %w", err)
	}

	return file, nil
}

// GetFilesBySessionID 获取会话关联的所有文件
func (r *CopywritingRepo) GetFilesBySessionID(ctx context.Context, sessionID int64) ([]*entity.CopywritingFile, error) {
	sql, args, err := r.Builder.
		Select("id, session_id, title, content, file_path, company_id, user_id, version, is_deleted, created_at, updated_at").
		From("copywriting_files").
		Where("session_id = ?", sessionID).
		OrderBy("created_at DESC").
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("CopywritingRepo - GetFilesBySessionID - r.Builder: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("CopywritingRepo - GetFilesBySessionID - r.DB.Query: %w", err)
	}
	defer rows.Close()

	files := make([]*entity.CopywritingFile, 0, _defaultEntityCap)
	for rows.Next() {
		file := &entity.CopywritingFile{}
		err = rows.Scan(&file.ID, &file.SessionID, &file.Title, &file.Content, &file.FilePath,
			&file.CompanyID, &file.UserID, &file.Version, &file.IsDeleted, &file.CreatedAt, &file.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("CopywritingRepo - GetFilesBySessionID - rows.Scan: %w", err)
		}
		files = append(files, file)
	}

	return files, nil
}

// UpdateFile 更新文件内容
func (r *CopywritingRepo) UpdateFile(ctx context.Context, file *entity.CopywritingFile) error {
	now := time.Now().Unix()
	file.UpdatedAt = now

	sql, args, err := r.Builder.
		Update("copywriting_files").
		Set("title", file.Title).
		Set("content", file.Content).
		Set("file_path", file.FilePath).
		Set("version", file.Version).
		Set("updated_at", file.UpdatedAt).
		Where("id = ?", file.ID).
		ToSql()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - UpdateFile - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CopywritingRepo - UpdateFile - r.DB.Exec: %w", err)
	}

	return nil
}

// DeleteFile 软删除文件/恢复文件
func (r *CopywritingRepo) DeleteFile(ctx context.Context, id int64) error {
	now := time.Now().Unix()
	sql, args, err := r.Builder.
		Update("copywriting_files").
		Set("is_deleted", 1).
		Set("updated_at", now).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - DeleteFile - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CopywritingRepo - DeleteFile - r.DB.Exec: %w", err)
	}

	return nil
}

// RecoverFile 软删除恢复文件
func (r *CopywritingRepo) RecoverFile(ctx context.Context, id int64) error {
	now := time.Now().Unix()
	sql, args, err := r.Builder.
		Update("copywriting_files").
		Set("is_deleted", 0).
		Set("updated_at", now).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("CopywritingRepo - RecoverFile - r.Builder: %w", err)
	}

	_, err = r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CopywritingRepo - RecoverFile - r.DB.Exec: %w", err)
	}

	return nil
}

// GetFilesWithPage 分页获取所有文件 (过滤已删除的)
func (r *CopywritingRepo) GetFilesWithPage(ctx context.Context, companyID int64, userID int64, title string, page, pageSize int) ([]*entity.CopywritingFile, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	builder := r.Builder.
		Select("COUNT(*)").
		From("copywriting_files").
		Where("company_id = ? AND user_id = ? AND is_deleted = 0", companyID, userID)

	if title != "" {
		builder = builder.Where("title LIKE ?", "%"+title+"%")
	}

	// 总数
	countSQL, countArgs, err := builder.ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("CopywritingRepo - GetFilesWithPage - count builder: %w", err)
	}

	var total int
	err = r.DB.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("CopywritingRepo - GetFilesWithPage - count query: %w", err)
	}

	// 分页数据
	dataBuilder := r.Builder.
		Select("id, session_id, title, file_path, company_id, user_id, version, is_deleted, created_at, updated_at").
		From("copywriting_files").
		Where("company_id = ? AND user_id = ? AND is_deleted = 0", companyID, userID)

	if title != "" {
		dataBuilder = dataBuilder.Where("title LIKE ?", "%"+title+"%")
	}

	sql, args, err := dataBuilder.
		OrderBy("created_at DESC").
		Limit(uint64(pageSize)).
		Offset(uint64(offset)).
		ToSql()
	if err != nil {
		return nil, 0, fmt.Errorf("CopywritingRepo - GetFilesWithPage - r.Builder: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("CopywritingRepo - GetFilesWithPage - r.DB.Query: %w", err)
	}
	defer rows.Close()

	files := make([]*entity.CopywritingFile, 0, _defaultEntityCap)
	for rows.Next() {
		file := &entity.CopywritingFile{}
		err = rows.Scan(&file.ID, &file.SessionID, &file.Title, &file.FilePath,
			&file.CompanyID, &file.UserID, &file.Version, &file.IsDeleted, &file.CreatedAt, &file.UpdatedAt)
		if err != nil {
			return nil, 0, fmt.Errorf("CopywritingRepo - GetFilesWithPage - rows.Scan: %w", err)
		}
		files = append(files, file)
	}

	return files, total, nil
}
