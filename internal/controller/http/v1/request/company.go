package request

import "github.com/kakj-go/llm_reference_matrix/internal/entity"

type CreateCompany struct {
	Name   string `json:"name"`
	Avatar string `json:"avatar"` // 公司图片
}

func (u *CreateCompany) ToEntity() *entity.Company {
	return &entity.Company{
		Name:   u.Name,
		Avatar: u.Avatar,
	}
}

type UpdateCompany struct {
	Avatar           string `json:"avatar"`
	Name             string `json:"name"`
	Industry         string `json:"industry"`
	Phone            string `json:"phone"`
	BrandName        string `json:"brand_name"`
	BrandPositioning string `json:"brand_positioning"`
	Region           string `json:"region"`
	AddressDetail    string `json:"address_detail"`
}

func (u *UpdateCompany) ToEntity() *entity.Company {
	return &entity.Company{
		Avatar:           u.Avatar,
		Name:             u.Name,
		Industry:         u.Industry,
		Phone:            u.Phone,
		BrandName:        u.BrandName,
		BrandPositioning: u.BrandPositioning,
		Region:           u.Region,
		AddressDetail:    u.AddressDetail,
	}
}

type AddCompanyBalanceRequest struct {
	Balance int64 `json:"balance"`
}

type DeleteCompanyBalanceRequest struct {
	Balance int64 `json:"balance"`
}

type ChangeManagerRequest struct {
	ManagerUserID int `json:"user_manager_id"`
}
