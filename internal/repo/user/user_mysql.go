package user

import (
	"context"
	"fmt"
	"time"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

const _defaultEntityCap = 64

// UserRepo -.
type UserRepo struct {
	*mysql.MySQL
}

// NewUserRepo -.
func NewUserRepo(db *mysql.MySQL) *UserRepo {
	return &UserRepo{db}
}

// GetUserByID -.
func (r *UserRepo) GetUserByID(ctx context.Context, id int64) (*entity.User, error) {
	sql, args, err := r.Builder.
		Select("id, avatar, phone, username, nickname, company_id, created_at, updated_at, deleted_at, passwd, salt").
		From("users").
		Where("id = ? AND deleted_at = 0", id). // 软删除检查
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("UserRepo - GetUserByID - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sql, args...)

	user := &entity.User{}
	err = row.Scan(&user.ID, &user.Avatar, &user.Phone, &user.Username, &user.Nickname, &user.CompanyID,
		&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt, &user.Passwd, &user.Salt)
	if err != nil {
		return nil, fmt.Errorf("UserRepo - GetUserByID - row.Scan: %w", err)
	}

	return user, nil
}

// GetUserByPhone -.
func (r *UserRepo) GetUserByPhone(ctx context.Context, phone string) (*entity.User, error) {
	sql, args, err := r.Builder.
		Select("id, avatar, phone, username, nickname, company_id, created_at, updated_at, deleted_at, passwd, salt").
		From("users").
		Where("phone = ? AND deleted_at = 0", phone).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("UserRepo - GetUserByPhone - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sql, args...)

	user := &entity.User{}
	err = row.Scan(&user.ID, &user.Avatar, &user.Phone, &user.Username, &user.Nickname, &user.CompanyID,
		&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt, &user.Passwd, &user.Salt)
	if err != nil {
		return nil, fmt.Errorf("UserRepo - GetUserByPhone - row.Scan: %w", err)
	}

	return user, nil
}

// GetUserByUsername.
func (r *UserRepo) GetUserByUsername(ctx context.Context, username string) (*entity.User, error) {
	sql, args, err := r.Builder.
		Select("id, avatar, phone, username, nickname, company_id, created_at, updated_at, deleted_at, passwd, salt").
		From("users").
		Where("username = ? AND deleted_at = 0", username).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("UserRepo - GetUserByUsername - r.Builder: %w", err)
	}

	row := r.DB.QueryRowContext(ctx, sql, args...)

	user := &entity.User{}
	err = row.Scan(&user.ID, &user.Avatar, &user.Phone, &user.Username, &user.Nickname, &user.CompanyID,
		&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt, &user.Passwd, &user.Salt)
	if err != nil {
		return nil, fmt.Errorf("UserRepo - GetUserByUsername - row.Scan: %w", err)
	}

	return user, nil
}

func (r *UserRepo) GetUsersByCompanyID(ctx context.Context, companyID int64, name, phone string, limit, offset int) ([]*entity.User, error) {
	query := r.Builder.Select("id, avatar, phone, username, nickname, company_id, created_at, updated_at, deleted_at").
		From("users")
	query = query.Where("company_id = ? AND deleted_at = 0", companyID)
	if name != "" {
		query = query.Where("nickname LIKE ?", "%"+name+"%")
	}
	if phone != "" {
		query = query.Where("phone LIKE ?", "%"+phone+"%")
	}
	sql, args, err := query.
		OrderBy("id DESC").
		Limit(uint64(limit)).
		Offset(uint64(offset)).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("UserRepo - GetUsersByCompanyID - r.Builder: %w", err)
	}

	rows, err := r.DB.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("UserRepo - GetUsersByCompanyID - r.DB.Query: %w", err)
	}
	defer rows.Close()

	users := make([]*entity.User, 0, _defaultEntityCap)

	for rows.Next() {
		user := &entity.User{}
		err = rows.Scan(&user.ID, &user.Avatar, &user.Phone, &user.Username, &user.Nickname, &user.CompanyID,
			&user.CreatedAt, &user.UpdatedAt, &user.DeletedAt)
		if err != nil {
			return nil, fmt.Errorf("UserRepo - GetUsersByCompanyID - rows.Scan: %w", err)
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("UserRepo - GetUsersByCompanyID - rows.Err: %w", err)
	}

	return users, nil
}

// CountUsersByCompanyID - 统计指定公司下的用户数量
func (r *UserRepo) CountUsersByCompanyID(ctx context.Context, companyID int64, name, phone string) (int, error) {
	query := r.Builder.Select("COUNT(*)").
		From("users")
	query = query.Where("company_id = ? AND deleted_at = 0", companyID)
	if name != "" {
		query = query.Where("nickname LIKE ?", "%"+name+"%")
	}
	if phone != "" {
		query = query.Where("phone LIKE ?", "%"+phone+"%")
	}

	sql, args, err := query.ToSql()
	if err != nil {
		return 0, fmt.Errorf("UserRepo - CountUsersByCompanyID - r.Builder: %w", err)
	}

	var count int
	err = r.DB.QueryRowContext(ctx, sql, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("UserRepo - CountUsersByCompanyID - r.DB.QueryRow: %w", err)
	}

	return count, nil
}

// GetUsersWithPage - 根据公司ID获取用户列表（简化分页调用）
func (r *UserRepo) GetUsersWithPage(ctx context.Context, companyID int64, name, phone string, page, pageSize int) ([]*entity.User, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	users, err := r.GetUsersByCompanyID(ctx, companyID, name, phone, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	total, err := r.CountUsersByCompanyID(ctx, companyID, name, phone)
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// CreateUser -.
func (r *UserRepo) CreateUser(ctx context.Context, user *entity.User) error {
	now := time.Now().Unix()
	user.CreatedAt = now
	user.UpdatedAt = now

	sql, args, err := r.Builder.
		Insert("users").
		Columns("avatar, phone, username, nickname, company_id, salt, passwd, created_at, updated_at, deleted_at").
		Values(user.Avatar, user.Phone, user.Username, user.Nickname, user.CompanyID, user.Salt, user.Passwd, user.CreatedAt, user.UpdatedAt, 0).
		ToSql()
	if err != nil {
		return fmt.Errorf("UserRepo - CreateUser - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("UserRepo - CreateUser - r.DB.Exec: %w", err)
	}

	// 获取自增ID
	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("UserRepo - CreateUser - result.LastInsertId: %w", err)
	}

	user.ID = lastInsertID
	return nil
}

// UpdateUser -.
func (r *UserRepo) UpdateUser(ctx context.Context, user *entity.User) error {
	user.UpdatedAt = time.Now().Unix()

	sql, args, err := r.Builder.
		Update("users").
		Set("avatar", user.Avatar).
		Set("phone", user.Phone).
		Set("nickname", user.Nickname).
		Set("updated_at", user.UpdatedAt).
		Set("passwd", user.Passwd).
		Where("id = ? AND deleted_at = 0", user.ID).
		ToSql()
	if err != nil {
		return fmt.Errorf("UserRepo - UpdateUser - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("UserRepo - UpdateUser - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("UserRepo - UpdateUser - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("UserRepo - UpdateUser - user not found or already deleted")
	}

	return nil
}

// SoftDeleteUser - 软删除用户
func (r *UserRepo) SoftDeleteUser(ctx context.Context, id int64) error {
	deletedAt := time.Now().Unix()

	sql, args, err := r.Builder.
		Update("users").
		Set("deleted_at", deletedAt).
		Set("updated_at", deletedAt).
		Where("id = ? AND deleted_at = 0", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("UserRepo - SoftDeleteUser - r.Builder: %w", err)
	}

	result, err := r.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("UserRepo - SoftDeleteUser - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("UserRepo - SoftDeleteUser - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("UserRepo - SoftDeleteUser - user not found or already deleted")
	}

	return nil
}

// CountUsers - 统计用户数量（排除已删除的）
func (r *UserRepo) CountUsers(ctx context.Context) (int, error) {
	sql, _, err := r.Builder.
		Select("COUNT(*)").
		From("users").
		Where("deleted_at = 0").
		ToSql()
	if err != nil {
		return 0, fmt.Errorf("UserRepo - CountUsers - r.Builder: %w", err)
	}

	var count int
	err = r.DB.QueryRowContext(ctx, sql).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("UserRepo - CountUsers - r.DB.QueryRow: %w", err)
	}

	return count, nil
}

// CheckPhoneExists - 检查手机号是否存在
func (r *UserRepo) CheckPhoneExists(ctx context.Context, phone string, excludeID ...int) (bool, error) {
	builder := r.Builder.
		Select("COUNT(*)").
		From("users").
		Where("phone = ? AND deleted_at = 0", phone)

	// 如果提供了排除的ID（用于更新时检查）
	if len(excludeID) > 0 && excludeID[0] > 0 {
		builder = builder.Where("id != ?", excludeID[0])
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return false, fmt.Errorf("UserRepo - CheckPhoneExists - r.Builder: %w", err)
	}

	var count int
	err = r.DB.QueryRowContext(ctx, sql, args...).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("UserRepo - CheckPhoneExists - r.DB.QueryRow: %w", err)
	}

	return count > 0, nil
}

// CheckUsernameExists - 检查手机号是否存在
func (r *UserRepo) CheckUsernameExists(ctx context.Context, username string, excludeID ...int) (bool, error) {
	builder := r.Builder.
		Select("COUNT(*)").
		From("users").
		Where("username = ? AND deleted_at = 0", username)

	// 如果提供了排除的ID（用于更新时检查）
	if len(excludeID) > 0 && excludeID[0] > 0 {
		builder = builder.Where("id != ?", excludeID[0])
	}

	sql, args, err := builder.ToSql()
	if err != nil {
		return false, fmt.Errorf("UserRepo - CheckUsernameExists - r.Builder: %w", err)
	}

	var count int
	err = r.DB.QueryRowContext(ctx, sql, args...).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("UserRepo - CheckUsernameExists - r.DB.QueryRow: %w", err)
	}

	return count > 0, nil
}
