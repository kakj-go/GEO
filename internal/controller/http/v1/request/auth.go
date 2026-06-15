package request

type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type InitRequest struct {
	CompanyName string `json:"company_name" validate:"required"`
	Username    string `json:"username" validate:"required,min=6"`
	Password    string `json:"password" validate:"required,min=6"`
}
