package company

import (
	"context"
	"fmt"
	"time"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/pkg/mysql"
)

type CompanyRepo struct {
	*mysql.MySQL
}

func NewCompanyRepo(db *mysql.MySQL) *CompanyRepo {
	return &CompanyRepo{db}
}

func (c CompanyRepo) GetCompanyByID(ctx context.Context, id int64) (*entity.Company, error) {
	sql, args, err := c.Builder.
		Select("id, name, avatar, industry, phone, brand_name, brand_positioning, region, address_detail, balance, manager_user_id, created_at, updated_at").
		From("companys").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return nil, fmt.Errorf("CompanyRepo - GetCompanyByID - r.Builder: %w", err)
	}

	row := c.DB.QueryRowContext(ctx, sql, args...)

	company := &entity.Company{}
	err = row.Scan(&company.ID, &company.Name, &company.Avatar, &company.Industry, &company.Phone, &company.BrandName, &company.BrandPositioning, &company.Region, &company.AddressDetail, &company.Balance, &company.ManagerUserId,
		&company.CreatedAt, &company.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("CompanyRepo - GetCompanyByID - row.Scan: %w", err)
	}

	return company, nil
}

func (c CompanyRepo) CreateCompany(ctx context.Context, company *entity.Company) error {
	now := time.Now().Unix()
	company.CreatedAt = now
	company.UpdatedAt = now

	sql, args, err := c.Builder.
		Insert("companys").
		Columns("name, avatar, industry, phone, brand_name, brand_positioning, region, address_detail, balance, manager_user_id, created_at, updated_at").
		Values(company.Name, company.Avatar, company.Industry, company.Phone, company.BrandName, company.BrandPositioning, company.Region, company.AddressDetail, 0, 0, company.CreatedAt, company.UpdatedAt).
		ToSql()
	if err != nil {
		return fmt.Errorf("CompanyRepo - CreateCompany - r.Builder: %w", err)
	}

	result, err := c.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CompanyRepo - CreateCompany - r.DB.Exec: %w", err)
	}

	// 获取自增ID
	lastInsertID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("CompanyRepo - CreateCompany - result.LastInsertId: %w", err)
	}

	company.ID = lastInsertID
	return nil
}

func (c CompanyRepo) UpdateCompany(ctx context.Context, company *entity.Company) error {
	company.UpdatedAt = time.Now().Unix()

	sql, args, err := c.Builder.
		Update("companys").
		Set("name", company.Name).
		Set("avatar", company.Avatar).
		Set("industry", company.Industry).
		Set("phone", company.Phone).
		Set("brand_name", company.BrandName).
		Set("brand_positioning", company.BrandPositioning).
		Set("region", company.Region).
		Set("address_detail", company.AddressDetail).
		Set("updated_at", company.UpdatedAt).
		Where("id = ?", company.ID).
		ToSql()
	if err != nil {
		return fmt.Errorf("CompanyRepo - UpdateCompany - r.Builder: %w", err)
	}

	result, err := c.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CompanyRepo - UpdateCompany - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("CompanyRepo - UpdateCompany - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("CompanyRepo - UpdateCompany - company not found or already deleted")
	}
	return nil
}

func (c CompanyRepo) AddCompanyBalance(ctx context.Context, id int64, addBalance int64) error {
	if addBalance <= 0 {
		return fmt.Errorf("CompanyRepo - AddCompanyBalance - addBalance must be positive")
	}

	// 使用事务确保数据一致性
	tx, err := c.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("CompanyRepo - AddCompanyBalance - begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 使用 SELECT 锁定记录，SQLite 通过事务和 WAL 模式处理并发
	sql, args, err := c.Builder.
		Select("id, balance").
		From("companys").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("CompanyRepo - AddCompanyBalance - r.Builder select: %w", err)
	}

	var currentBalance int64
	err = tx.QueryRowContext(ctx, sql, args...).Scan(&id, &currentBalance)
	if err != nil {
		return fmt.Errorf("CompanyRepo - AddCompanyBalance - select balance: %w", err)
	}

	// 更新余额
	newBalance := currentBalance + addBalance
	updateSQL, updateArgs, err := c.Builder.
		Update("companys").
		Set("balance", newBalance).
		Set("updated_at", time.Now().Unix()).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("CompanyRepo - AddCompanyBalance - r.Builder update: %w", err)
	}

	result, err := tx.ExecContext(ctx, updateSQL, updateArgs...)
	if err != nil {
		return fmt.Errorf("CompanyRepo - AddCompanyBalance - update balance: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("CompanyRepo - AddCompanyBalance - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("CompanyRepo - AddCompanyBalance - company not found")
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("CompanyRepo - AddCompanyBalance - commit transaction: %w", err)
	}

	return nil
}

func (c CompanyRepo) DeleteCompanyBalance(ctx context.Context, id int64, deleteBalance int64) error {
	if deleteBalance <= 0 {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - deleteBalance must be positive")
	}

	// 使用事务确保数据一致性
	tx, err := c.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 使用 SELECT 锁定记录
	sql, args, err := c.Builder.
		Select("id, balance").
		From("companys").
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - r.Builder select: %w", err)
	}

	var currentBalance int64
	err = tx.QueryRowContext(ctx, sql, args...).Scan(&id, &currentBalance)
	if err != nil {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - select balance: %w", err)
	}

	// 检查余额是否足够
	if currentBalance < deleteBalance {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - insufficient balance: current %d, required %d",
			currentBalance, deleteBalance)
	}

	// 更新余额
	newBalance := currentBalance - deleteBalance
	updateSQL, updateArgs, err := c.Builder.
		Update("companys").
		Set("balance", newBalance).
		Set("updated_at", time.Now().Unix()).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - r.Builder update: %w", err)
	}

	result, err := tx.ExecContext(ctx, updateSQL, updateArgs...)
	if err != nil {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - update balance: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - company not found")
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("CompanyRepo - DeleteCompanyBalance - commit transaction: %w", err)
	}

	return nil
}

func (c CompanyRepo) ChangeManagerUserID(ctx context.Context, id int64, changeManagerUserID int) error {
	sql, args, err := c.Builder.
		Update("companys").
		Set("manager_user_id", changeManagerUserID).
		Set("updated_at", time.Now().Unix()).
		Where("id = ?", id).
		ToSql()
	if err != nil {
		return fmt.Errorf("CompanyRepo - ChangeManagerUserID - r.Builder: %w", err)
	}

	result, err := c.DB.ExecContext(ctx, sql, args...)
	if err != nil {
		return fmt.Errorf("CompanyRepo - ChangeManagerUserID - r.DB.Exec: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("CompanyRepo - ChangeManagerUserID - result.RowsAffected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("CompanyRepo - ChangeManagerUserID - company not found or already deleted")
	}
	return nil
}

func (c CompanyRepo) AnyExists(ctx context.Context) (bool, error) {
	sql, args, err := c.Builder.
		Select("COUNT(*)").
		From("companys").
		ToSql()
	if err != nil {
		return false, fmt.Errorf("CompanyRepo - AnyExists - r.Builder: %w", err)
	}

	var count int
	err = c.DB.QueryRowContext(ctx, sql, args...).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("CompanyRepo - AnyExists - c.DB.QueryRow: %w", err)
	}

	return count > 0, nil
}
