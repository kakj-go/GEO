package entity

// CopywritingSession 方案设计专家会话
type CopywritingSession struct {
	ID        int64        `json:"id"`
	Title     string       `json:"title"`
	CompanyID int64        `json:"company_id"`
	UserID    int64        `json:"user_id"`
	ModelID   string       `json:"model_id"`
	Mode      string       `json:"mode"` // quick, think
	Messages  ChatMessages `json:"messages"`
	CreatedAt int64        `json:"created_at"`
	UpdatedAt int64        `json:"updated_at"`
}

// CopywritingSessionList 会话列表
type CopywritingSessionList struct {
	Sessions []*CopywritingSession `json:"sessions"`
	Total    int                   `json:"total"`
	Page     int                   `json:"page"`
	Size     int                   `json:"size"`
}

// CopywritingFile 方案文件
type CopywritingFile struct {
	ID        int64  `json:"id"`
	SessionID int64  `json:"session_id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	FilePath  string `json:"file_path"`
	CompanyID int64  `json:"company_id"`
	UserID    int64  `json:"user_id"`
	Version   int    `json:"version"`
	IsDeleted int    `json:"is_deleted"` // 0:正常 1:已删除
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}

// CopywritingFileList 文件列表
type CopywritingFileList struct {
	Files []*CopywritingFile `json:"files"`
	Total int                `json:"total"`
	Page  int                `json:"page"`
	Size  int                `json:"size"`
}

// ChatMessage 单条对话消息
type ChatMessage struct {
	Role           string          `json:"role"` // user, assistant, system
	Content        string          `json:"content"`
	Timestamp      int64           `json:"timestamp"`
	FileID         int64           `json:"file_id,omitempty"` // 关联文件ID（assistant消息生成文件时）
	ReferenceItems []ReferenceItem `json:"reference_items,omitempty"`
}

// ReferenceItem 用户提供的参考资料
type ReferenceItem struct {
	Type    string `json:"type"`    // "file", "clipboard", "material"
	Name    string `json:"name"`    // 文件名或参考标题
	Content string `json:"content"` // 内容
}

// ChatMessages JSON 可序列化的消息列表
type ChatMessages []ChatMessage
