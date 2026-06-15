package entity

// AssetsLibrary 资产库实体
type AssetsLibrary struct {
	ID          int64       `json:"id"`
	Path        string      `json:"path"`        // 资产路径
	Title       string      `json:"title"`       // 资产标题
	Type        string      `json:"type"`        // 资产类型, image, video
	Description string      `json:"description"` // 资产描述
	Size        int64       `json:"size"`        // 资产大小（字节）
	Suffix      string      `json:"suffix"`      // 资产后缀
	Tags        StringSlice `json:"tags"`        // 标签（多个）
	UserID      int64       `json:"user_id"`     // 用户ID
	CompanyID   int64       `json:"company_id"`  // 公司ID
	IsPublic    bool        `json:"is_public"`   // 是否公用
	CreatedAt   int64       `json:"created_at"`  // 创建时间（时间戳）
	UpdatedAt   int64       `json:"updated_at"`  // 更新时间（时间戳）
}

// AssetsLibraryList 资产库列表实体
type AssetsLibraryList struct {
	Assets []*AssetsLibrary `json:"assets"`
	Total  int              `json:"total"`
	Page   int              `json:"page"`
	Size   int              `json:"size"`
}
