package company

import (
	"context"
	"fmt"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
)

type CompanyCase struct {
	repo     repo.CompanyRepo
	userResp repo.UserRepo
}

// New -.
func New(r repo.CompanyRepo, userResp repo.UserRepo) *CompanyCase {
	return &CompanyCase{
		repo:     r,
		userResp: userResp,
	}
}

func (c CompanyCase) GetCompanyByID(ctx context.Context, id int64) (*entity.Company, error) {
	dbUser, err := c.userResp.GetUserByID(ctx, ctx.Value(constants.UserID).(int64))
	if err != nil {
		return nil, fmt.Errorf("CompanyCase - GetCompanyByID - company.repo.GetUserByID: %w", err)
	}
	if dbUser.CompanyID != id && id != constants.RootUserID {
		return nil, fmt.Errorf("CompanyCase - GetCompanyByID - company.repo.GetCompanyByID: %s", "权限校验失败")
	}

	company, err := c.repo.GetCompanyByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("CompanyCase - GetCompanyByID - company.repo.GetCompanyByID: %w", err)
	}

	return company, nil
}

func (c CompanyCase) CreateCompany(ctx context.Context, company *entity.Company) error {
	value := ctx.Value(constants.UserID)
	if value.(int64) != constants.RootUserID {
		return fmt.Errorf("CompanyCase - CreateCompany - company.repo.CreateCompany: %s", "权限校验失败")
	}
	err := c.repo.CreateCompany(ctx, company)
	if err != nil {
		return fmt.Errorf("CompanyCase - CreateCompany - company.repo.CreateCompany: %w", err)
	}

	return nil
}

func (c CompanyCase) UpdateCompany(ctx context.Context, company *entity.Company) error {
	dbCompany, err := c.repo.GetCompanyByID(ctx, company.ID)
	if err != nil {
		return fmt.Errorf("CompanyCase - UpdateCompany - company.repo.GetCompanyByID: %w", err)
	}
	if ctx.Value(constants.UserID).(int64) != constants.RootUserID && dbCompany.ManagerUserId != ctx.Value(constants.UserID).(int64) {
		return fmt.Errorf("CompanyCase - UpdateCompany - company.repo.UpdateCompany: %s", "权限校验失败")
	}

	err = c.repo.UpdateCompany(ctx, company)
	if err != nil {
		return fmt.Errorf("CompanyCase - UpdateCompany - company.repo.UpdateCompany: %w", err)
	}

	return nil
}

func (c CompanyCase) AddCompanyBalance(ctx context.Context, id int64, addBalance int64) error {
	if ctx.Value(constants.UserID).(int64) != constants.RootUserID {
		return fmt.Errorf("CompanyCase - AddCompanyBalance - company.repo.AddCompanyBalance: %s", "权限校验失败")
	}
	err := c.repo.AddCompanyBalance(ctx, id, addBalance)
	if err != nil {
		return fmt.Errorf("CompanyCase - AddCompanyBalance - company.repo.AddCompanyBalance: %w", err)
	}

	return nil
}

func (c CompanyCase) DeleteCompanyBalance(ctx context.Context, id int64, deleteBalance int64) error {
	if ctx.Value(constants.UserID).(int64) != constants.RootUserID {
		return fmt.Errorf("CompanyCase - DeleteCompanyBalance - company.repo.DeleteCompanyBalance: %s", "权限校验失败")
	}

	err := c.repo.DeleteCompanyBalance(ctx, id, deleteBalance)
	if err != nil {
		return fmt.Errorf("CompanyCase - DeleteCompanyBalance - company.repo.DeleteCompanyBalance: %w", err)
	}

	return nil
}

func (c CompanyCase) ChangeManagerUserID(ctx context.Context, id int64, changeManagerUserID int) error {
	if ctx.Value(constants.UserID).(int64) != constants.RootUserID {
		return fmt.Errorf("CompanyCase - DeleteCompanyBalance - company.repo.DeleteCompanyBalance: %s", "权限校验失败")
	}

	err := c.repo.ChangeManagerUserID(ctx, id, changeManagerUserID)
	if err != nil {
		return fmt.Errorf("CompanyCase - ChangeManagerUserID - company.repo.ChangeManagerUserID: %w", err)
	}

	return nil
}
