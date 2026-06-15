// usecase/auth.go
package usecase

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/pkg/constants"
	"github.com/kakj-go/llm_reference_matrix/pkg/md5"
)

type AuthUseCase struct {
	userRepo    repo.UserRepo
	companyRepo repo.CompanyRepo
	modelRepo   repo.ModelRepo
}

func New(userRepo repo.UserRepo, companyRepo repo.CompanyRepo, modelRepo repo.ModelRepo) *AuthUseCase {
	return &AuthUseCase{
		userRepo:    userRepo,
		companyRepo: companyRepo,
		modelRepo:   modelRepo,
	}
}

func (uc *AuthUseCase) Login(ctx context.Context, username, password string) (string, error) {
	// 从数据库获取用户
	user, err := uc.userRepo.GetUserByUsername(ctx, username)
	if err != nil {
		return "", fmt.Errorf("AuthUseCase - Login: %s", "用户名或密码错误")
	}

	passwordHash := md5.EncryptPassword(password, user.Salt)
	// 验证密码
	if passwordHash != user.Passwd {
		return "", fmt.Errorf("AuthUseCase - Login: %s", "用户名或密码错误")
	}

	return uc.generateToken(user)
}

func (uc *AuthUseCase) GetInitStatus(ctx context.Context) (bool, error) {
	return uc.companyRepo.AnyExists(ctx)
}

func (uc *AuthUseCase) Init(ctx context.Context, companyName, username, password string) (string, error) {
	// 1. 检查是否已经初始化
	alreadyInit, err := uc.companyRepo.AnyExists(ctx)
	if err != nil {
		return "", fmt.Errorf("AuthUseCase - Init - AnyExists: %w", err)
	}
	if alreadyInit {
		return "", fmt.Errorf("AuthUseCase - Init: %s", "系统已初始化")
	}

	// 2. 创建公司
	comp := &entity.Company{
		Name: companyName,
	}
	if err := uc.companyRepo.CreateCompany(ctx, comp); err != nil {
		return "", fmt.Errorf("AuthUseCase - Init - CreateCompany: %w", err)
	}

	// 3. 创建用户
	u := &entity.User{
		Username:  username,
		Nickname:  "管理员",
		CompanyID: comp.ID,
		Salt:      md5.GenerateSalt(),
	}
	u.Passwd = md5.EncryptPassword(password, u.Salt)
	if err := uc.userRepo.CreateUser(ctx, u); err != nil {
		return "", fmt.Errorf("AuthUseCase - Init - CreateUser: %w", err)
	}

	// 4. 更新公司管理员
	if err := uc.companyRepo.ChangeManagerUserID(ctx, comp.ID, int(u.ID)); err != nil {
		return "", fmt.Errorf("AuthUseCase - Init - ChangeManagerUserID: %w", err)
	}

	// 5. 设置初始默认模型
	// NanoBanana2 -> gemini-3.1-flash-image-preview
	if err := uc.modelRepo.SetBuiltinDefaultModel(ctx, comp.ID, "image_generation", "gemini-3.1-flash-image-preview"); err != nil {
		return "", fmt.Errorf("AuthUseCase - Init - SetBuiltinDefaultModel (image): %w", err)
	}
	// Seedance 1.5 Pro -> doubao-seedance-1-5-pro
	if err := uc.modelRepo.SetBuiltinDefaultModel(ctx, comp.ID, "video_generation", "doubao-seedance-1-5-pro"); err != nil {
		return "", fmt.Errorf("AuthUseCase - Init - SetBuiltinDefaultModel (video): %w", err)
	}
	// Gemini 2.5 Pro -> gemini-2.5-pro
	if err := uc.modelRepo.SetBuiltinDefaultModel(ctx, comp.ID, "llm", "gemini-2.5-pro"); err != nil {
		return "", fmt.Errorf("AuthUseCase - Init - SetBuiltinDefaultModel (llm): %w", err)
	}

	// 6. 生成 Token
	return uc.generateToken(u)
}

func (uc *AuthUseCase) generateToken(user *entity.User) (string, error) {
	// 生成 JWT token
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims[constants.UserID] = user.ID
	claims[constants.Username] = user.Username
	claims[constants.CompanyID] = user.CompanyID
	claims[constants.Exp] = time.Now().Add(time.Hour * 24).Unix() // 24小时过期

	tokenString, err := token.SignedString([]byte(config.GetConfig().Jwt.Secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
