package request

import (
	"regexp"
	"strings"
	"unicode"

	"github.com/kakj-go/llm_reference_matrix/internal/entity"
)

type CreateUser struct {
	Avatar    string `json:"avatar"`     // 头像URL地址
	Phone     string `json:"phone"`      // 电话
	Username  string `json:"username"`   // 用户名
	Nickname  string `json:"nickname"`   // 昵称
	CompanyID int64  `json:"company_id"` // 所属公司ID
	Passwd    string `json:"passwd"`     // 密码
}

func (u *CreateUser) ToEntity() *entity.User {
	return &entity.User{
		Avatar:    u.Avatar,
		Phone:     u.Phone,
		Username:  u.Username,
		Nickname:  u.Nickname,
		Passwd:    u.Passwd,
		CompanyID: u.CompanyID,
	}
}

type UpdateUser struct {
	Avatar   string `json:"avatar"`   // 头像URL地址
	Nickname string `json:"nickname"` // 昵称
	Phone    string `json:"phone"`    // 电话
	Passwd   string `json:"passwd"`   // 密码
}

func (u *UpdateUser) ToEntity() *entity.User {
	return &entity.User{
		Avatar:   u.Avatar,
		Nickname: u.Nickname,
		Phone:    u.Phone,
		Passwd:   u.Passwd,
	}
}

func IsValidPhone(phone string) bool {
	// 校验是否为纯数字
	phoneRegex := regexp.MustCompile(`^[0-9]+$`)
	return phoneRegex.MatchString(phone)
}

func IsValidPassword(password string) bool {
	// 校验密码复杂度：至少包含字母和数字
	hasLetter := false
	hasDigit := false

	for _, char := range password {
		if unicode.IsLetter(char) {
			hasLetter = true
		} else if unicode.IsDigit(char) {
			hasDigit = true
		}
	}

	return hasLetter && hasDigit
}

func IsValidURL(url string) bool {
	// 支持localhost、IP地址和域名的URL格式校验
	urlRegex := regexp.MustCompile(`^(http|https)://(localhost|((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})(/\S*)?$`)
	return urlRegex.MatchString(url)
}

func IsValidNickname(nickname string) bool {
	if len(strings.TrimSpace(nickname)) <= 0 {
		return false
	}
	return true
}

func IsValidUsername(username string) bool {
	if len(strings.TrimSpace(username)) <= 5 {
		return false
	}
	return true
}
