package entity

type Company struct {
	ID               int64  `json:"id"`
	Name             string `json:"name"`
	Avatar           string `json:"avatar"`            // 公司图片
	Industry         string `json:"industry"`          // 所属行业
	Phone            string `json:"phone"`             // 联系方式
	BrandName        string `json:"brand_name"`        // 品牌名称
	BrandPositioning string `json:"brand_positioning"` // 品牌定位
	Region           string `json:"region"`            // 所在地址(JSON/String)
	AddressDetail    string `json:"address_detail"`    // 详细地址
	Balance          int64  `json:"balance"`
	ManagerUserId    int64  `json:"manager_user_id"` // 管理员的id
	CreatedAt        int64  `json:"created_at"`      // 创建时间（时间戳）
	UpdatedAt        int64  `json:"updated_at"`      // 更新时间（时间戳）
}
