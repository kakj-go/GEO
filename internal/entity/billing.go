package entity

type TransactionHistory struct {
	ID            int64  `json:"id"`
	CompanyID     int64  `json:"company_id"`
	UserID        int64  `json:"user_id"`
	Type          string `json:"type"` // recharge, adjustment, consumption
	Amount        int64  `json:"amount"`
	BalanceBefore int64  `json:"balance_before"`
	BalanceAfter  int64  `json:"balance_after"`
	OrderID       string `json:"order_id"`
	PaymentMethod string `json:"payment_method"`
	Remark        string `json:"remark"`
	CreatedAt     int64  `json:"created_at"`
}

type UsageLog struct {
	ID               int64   `json:"id"`
	CompanyID        int64   `json:"company_id"`
	UserID           int64   `json:"user_id"`
	SessionID        int64   `json:"session_id,omitempty"`
	ModelID          string  `json:"model_id"`
	PromptTokens     int     `json:"prompt_tokens"`
	CompletionTokens int     `json:"completion_tokens"`
	TotalTokens      int     `json:"total_tokens"`
	PromptPoints     int64   `json:"prompt_points"`
	CompletionPoints int64   `json:"completion_points"`
	Points           int64   `json:"points"`
	DurationMs       int64   `json:"duration_ms"`
	Throughput       float64 `json:"throughput"`
	FinishReason     string  `json:"finish_reason"`
	ContentPreview   string  `json:"content_preview"`
	CreatedAt        int64   `json:"created_at"`
}

type TransactionHistoryList struct {
	Transactions []*TransactionHistory `json:"transactions"`
	Total        int                   `json:"total"`
}

type UsageLogList struct {
	Logs  []*UsageLog `json:"logs"`
	Total int         `json:"total"`
}
type CostDetails struct {
	TotalPoints      int64 `json:"total_points"`
	PromptPoints     int64 `json:"prompt_points"`
	CompletionPoints int64 `json:"completion_points"`
}
