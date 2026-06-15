package user

import (
	"context"
	"fmt"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
	"github.com/kakj-go/llm_reference_matrix/pkg/md5"
)

// UseCase -.
type UseCase struct {
	repo        repo.UserRepo
	companyRepo repo.CompanyRepo
}

// New -.
func New(r repo.UserRepo, companyRepo repo.CompanyRepo) *UseCase {
	return &UseCase{
		repo:        r,
		companyRepo: companyRepo,
	}
}

// GetUserInfo - get user by ID.
func (uc *UseCase) GetUserInfo(ctx context.Context) (*entity.User, error) {
	id := ctx.Value(constants.UserID).(int64)

	user, err := uc.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("UserUseCase - GetUserByID - uc.repo.GetUserByID: %w", err)
	}
	user.Passwd = ""
	user.Salt = ""

	return user, nil
}

// GetUserByPhone - get user by phone number.
func (uc *UseCase) GetUserByPhone(ctx context.Context, phone string) (*entity.User, error) {
	user, err := uc.repo.GetUserByPhone(ctx, phone)
	if err != nil {
		return nil, fmt.Errorf("UserUseCase - GetUserByPhone - uc.repo.GetUserByPhone: %w", err)
	}

	return user, nil
}

// GetUserByUsername - get user by phone number.
func (uc *UseCase) GetUserByUsername(ctx context.Context, username string) (*entity.User, error) {
	user, err := uc.repo.GetUserByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("UserUseCase - GetUserByUsername - uc.repo.GetUserByUsername: %w", err)
	}

	return user, nil
}

// GetUsersByCompany - get users by company ID with pagination.
func (uc *UseCase) GetUsersByCompany(ctx context.Context, companyID int64, name, phone string, page, pageSize int) (*entity.UserList, error) {
	users, total, err := uc.repo.GetUsersWithPage(ctx, companyID, name, phone, page, pageSize)
	if err != nil {
		return nil, fmt.Errorf("UserUseCase - GetUsersByCompany - uc.repo.GetUsersByCompanyIDWithPage: %w", err)
	}

	return &entity.UserList{
		Users: users,
		Total: total,
		Page:  page,
		Size:  pageSize,
	}, nil
}

// CreateUser - create new user.
func (uc *UseCase) CreateUser(ctx context.Context, user *entity.User) error {
	// 如果不是 root 用户则公司 id 从 token 中拿
	if ctx.Value(constants.UserID).(int64) != constants.RootUserID {
		user.CompanyID = ctx.Value(constants.CompanyID).(int64)
		dbCompany, err := uc.companyRepo.GetCompanyByID(ctx, user.CompanyID)
		if err != nil {
			return fmt.Errorf("UserUseCase - CreateUser - uc.companyRepo.GetCompanyByID: %w", err)
		}
		if dbCompany.ManagerUserId != ctx.Value(constants.UserID).(int64) {
			return fmt.Errorf("CompanyCase - CreateUser - uc.repo.CreateUser: %s", "权限校验失败")
		}
	}

	// Check if phone already exists
	exists, err := uc.repo.CheckPhoneExists(ctx, user.Phone)
	if err != nil {
		return fmt.Errorf("UserUseCase - CreateUser - uc.repo.CheckPhoneExists: %w", err)
	}
	if exists {
		return entity.ErrPhoneAlreadyExists
	}

	// Check if username already exists
	exists, err = uc.repo.CheckUsernameExists(ctx, user.Username)
	if err != nil {
		return fmt.Errorf("UserUseCase - CreateUser - uc.repo.CheckUsernameExists: %w", err)
	}
	if exists {
		return entity.ErrUsernameAlreadyExists
	}

	user.Salt = md5.GenerateSalt()
	user.Passwd = md5.EncryptPassword(user.Passwd, user.Salt)
	err = uc.repo.CreateUser(ctx, user)
	if err != nil {
		return fmt.Errorf("UserUseCase - CreateUser - uc.repo.CreateUser: %w", err)
	}

	return nil
}

// UpdateUser - update user information.
func (uc *UseCase) UpdateUser(ctx context.Context, user *entity.User) error {
	dbUser, err := uc.repo.GetUserByID(ctx, user.ID)
	if err != nil {
		return fmt.Errorf("UserUseCase - UpdateUser - uc.repo.GetUserByID: %w", err)
	}
	dbCompany, err := uc.companyRepo.GetCompanyByID(ctx, dbUser.CompanyID)
	if err != nil {
		return fmt.Errorf("UserUseCase - UpdateUser - uc.companyRepo.GetCompanyByID: %w", err)
	}
	if user.ID != ctx.Value(constants.UserID).(int64) && ctx.Value(constants.UserID).(int64) != constants.RootUserID && dbCompany.ManagerUserId != ctx.Value(constants.UserID).(int64) {
		return fmt.Errorf("CompanyCase - UpdateUser - uc.repo.UpdateUser: %s", "权限校验失败")
	}

	dbUser.Nickname = user.Nickname
	dbUser.Avatar = user.Avatar
	dbUser.Phone = user.Phone
	if user.Passwd != "" {
		dbUser.Passwd = md5.EncryptPassword(user.Passwd, dbUser.Salt)
	}

	err = uc.repo.UpdateUser(ctx, dbUser)
	if err != nil {
		return fmt.Errorf("UserUseCase - UpdateUser - uc.repo.UpdateUser: %w", err)
	}

	return nil
}

// DeleteUser - soft delete user.
func (uc *UseCase) DeleteUser(ctx context.Context, id int64) error {
	dbUser, err := uc.repo.GetUserByID(ctx, id)
	if err != nil {
		return fmt.Errorf("UserUseCase - DeleteUser - uc.repo.GetUserByID: %w", err)
	}

	dbCompany, err := uc.companyRepo.GetCompanyByID(ctx, dbUser.CompanyID)
	if err != nil {
		return fmt.Errorf("UserUseCase - DeleteUser - uc.companyRepo.GetCompanyByID: %w", err)
	}
	if dbCompany.ManagerUserId != ctx.Value(constants.UserID).(int64) && ctx.Value(constants.UserID).(int64) != constants.RootUserID {
		return fmt.Errorf("CompanyCase - DeleteUser - uc.repo.DeleteUser: %s", "权限校验失败")
	}

	err = uc.repo.SoftDeleteUser(ctx, id)
	if err != nil {
		return fmt.Errorf("UserUseCase - DeleteUser - uc.repo.SoftDeleteUser: %w", err)
	}

	return nil
}

// GetUserCount - get total user count.
func (uc *UseCase) GetUserCount(ctx context.Context) (int, error) {
	count, err := uc.repo.CountUsers(ctx)
	if err != nil {
		return 0, fmt.Errorf("UserUseCase - GetUserCount - uc.repo.CountUsers: %w", err)
	}

	return count, nil
}

func (uc *UseCase) CheckPhoneExists(ctx context.Context, phone string, excludeID ...int) (bool, error) {
	ok, err := uc.repo.CheckPhoneExists(ctx, phone, excludeID...)
	if err != nil {
		return false, fmt.Errorf("UserUseCase - CheckPhoneExists - uc.repo.CheckPhoneExists: %w", err)
	}

	return ok, nil
}

func (uc *UseCase) CheckUsernameExists(ctx context.Context, username string, excludeID ...int) (bool, error) {
	ok, err := uc.repo.CheckUsernameExists(ctx, username, excludeID...)
	if err != nil {
		return false, fmt.Errorf("UserUseCase - CheckUsernameExists - uc.repo.CheckUsernameExists: %w", err)
	}

	return ok, nil
}
