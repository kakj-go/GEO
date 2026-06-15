package entity

import "errors"

// User represents a user entity.
type User struct {
	ID        int64  `json:"id"`
	Avatar    string `json:"avatar"`     // 头像URL地址
	Phone     string `json:"phone"`      // 电话
	Username  string `json:"username"`   // 用户名
	Nickname  string `json:"nickname"`   // 昵称
	CompanyID int64  `json:"company_id"` // 所属公司ID
	Passwd    string `json:"passwd"`
	Salt      string `json:"salt"`       // md5的盐
	CreatedAt int64  `json:"created_at"` // 创建时间（时间戳）
	UpdatedAt int64  `json:"updated_at"` // 更新时间（时间戳）
	DeletedAt int64  `json:"deleted_at"` // 删除时间（时间戳），0表示未删除
}

// UserList - 用户列表响应结构.
type UserList struct {
	Users []*User `json:"users"`
	Total int     `json:"total"`
	Page  int     `json:"page"`
	Size  int     `json:"size"`
}

// 错误定义.
var (
	ErrPhoneAlreadyExists    = errors.New("phone number already exists")
	ErrUsernameAlreadyExists = errors.New("username already exists")
	ErrUserNotFound          = errors.New("user not found")
)
