package entity

// MaterialLibrary 素材库实体
type MaterialLibrary struct {
	ID        int64       `json:"id"`         // 素材库ID
	Title     string      `json:"title"`      // 素材标题
	Content   string      `json:"content"`    // 素材内容(markdown格式)
	Tags      StringSlice `json:"tags"`       // 标签列表
	UserID    int64       `json:"user_id"`    // 用户ID
	CompanyID int64       `json:"company_id"` // 公司ID
	CreatedAt int64       `json:"created_at"` // 创建时间(时间戳)
	UpdatedAt int64       `json:"updated_at"` // 更新时间(时间戳)
}

// MaterialLibraryList 素材库列表响应实体
type MaterialLibraryList struct {
	Materials []*MaterialLibrary `json:"materials"` // 素材列表
	Total     int                `json:"total"`     // 总数
	Page      int                `json:"page"`      // 页码
	Size      int                `json:"size"`      // 每页数量
}
