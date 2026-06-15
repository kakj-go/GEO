package copywriting

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/kakj-go/llm_reference_matrix/config"
	"github.com/kakj-go/llm_reference_matrix/internal/entity"
	"github.com/kakj-go/llm_reference_matrix/internal/repo"
	"github.com/kakj-go/llm_reference_matrix/internal/usecase"
	"github.com/kakj-go/llm_reference_matrix/pkg/llm"
	"github.com/kakj-go/llm_reference_matrix/pkg/logger"
)

// StreamChunk 流式输出的单个块
type StreamChunk struct {
	Type             string `json:"type"`                        // "content", "reasoning", "file_created", "file_updated", "done", "error"
	Content          string `json:"content,omitempty"`           // 文本内容
	ReasoningContent string `json:"reasoning_content,omitempty"` // 思考内容
	FileID           int64  `json:"file_id,omitempty"`           // 文件ID
	Title            string `json:"title,omitempty"`             // 文件标题
}

// Skill 技能模板
type Skill struct {
	Name        string   `json:"name"`
	Keywords    []string `json:"keywords"`
	Description string   `json:"description"`
	Prompt      string   `json:"prompt"`
}

// CopywritingUseCase 方案设计专家用例
type CopywritingUseCase struct {
	repo        repo.CopywritingRepo
	modelRepo   repo.ModelRepo
	billingCase usecase.Billing
	l           logger.Interface
	skills      []Skill
}

// New 创建 CopywritingUseCase
func New(repo repo.CopywritingRepo, modelRepo repo.ModelRepo, billingCase usecase.Billing, l logger.Interface) *CopywritingUseCase {
	uc := &CopywritingUseCase{
		repo:        repo,
		modelRepo:   modelRepo,
		billingCase: billingCase,
		l:           l,
	}
	uc.loadSkills()
	return uc
}

// loadSkills 加载内置 skills
func (uc *CopywritingUseCase) loadSkills() {
	uc.skills = []Skill{
		{
			Name:        "民宿/酒店运营",
			Keywords:    []string{"民宿", "酒店"},
			Description: "专用于民宿/酒店行业的全域运营方案模板",
			Prompt: `你是一位专业且资深的民宿/酒店行业运营策划专家。

# 核心指令（必须严格遵守）
你必须严格按照下方【输出骨架】的结构、层级、章节顺序和表格列定义来输出方案。
- 禁止省略任何章节或子章节
- 禁止合并或拆分章节
- 禁止改变章节的层级关系
- 表格必须保持相同的列定义
- 每个 Week 必须分别针对不同平台（抖音/快手、小红书、视频号、携程等）给出差异化的内容设计
- 每个月份的"详解"部分必须按 Week 展开，每个 Week 必须分别给出【短视频】和【图文】两个维度的详细设计，包含运镜、画面、BGM/构图、文案标题等

你要做的是：根据用户提供的企业信息（品牌名、地理位置、目标客群、设施特色等），将骨架中的占位内容替换为针对该企业量身定制的真实创意内容。

# 输出骨架（必须严格遵循此结构）

` + "```" + `
**{品牌名} {年份} {季度}全域运营方案 ({月份范围}完全版)**

## 一、品牌声量：核心 Slogan 矩阵 (Brand Voice)
- 说明：Slogan 需贯穿所有平台，反复洗脑，植入用户心智。
  - **品牌主张 (Core Identity)** —— 用于门头、官网、账号简介
    "{品牌Slogan}"
  - **痛点直击 (For Parents)** —— 用于抖音/快手/视频号开头
    "{痛点Slogan}"
  - **情感共鸣 (For Emotion)** —— 用于小红书/朋友圈
    "{情感Slogan}"

## 二、顶层设计逻辑 (Strategy Logic)
- **第1个月（{定位关键词}期）**：
  主打"{情绪关键词}"。Slogan侧重"..."，解决...
  **痛点分析：** ...

  ### 气候痛点：...
  ### 破局策略（...）：...
  ### 心理痛点：...
  ### 竞争策略：...
  ### 蓄水逻辑：...

- **第2个月（{定位关键词}期）**：
  主打"{情绪关键词}"。...
  ### 1. 节气逻辑：...
  ### 2. 流量逻辑：...
  ### 3. 痛点逻辑：...
  ### 4. 品牌逻辑：...
  ### 总结

- **第3个月（{定位关键词}期）**：
  主打"{情绪关键词}"。...
  ### 1. 生理痛点：...
  ### 2. 节点逻辑：...
  ### 3. 资产逻辑：...
  ### 4. 节奏逻辑：...

三、运营策划

- {第1个月}运营策划：【{阶段名}】

  **视觉基调**：...

  | **周次** | **📢 本周传播 Slogan** | **各平台内容差异化设计 (Design & Content)** | **豆包 AI GEO** |
  | --- | --- | --- | --- |
  | **Week 1** | "..." | **抖音/快手**：...<br><br>**小红书**：...<br><br>**视频号**：... | - |
  | **Week 2** | "..." | ... | - |
  | **Week 3** | "..." | ... | - |
  | **Week 4** | "..." | ... | - |

- {第2个月}运营策划：【{阶段名}】
  （同上表格结构，4个Week）

- {第3个月}运营策划：【{阶段名}】
  （同上表格结构，4个Week）

1. 平台内容设计思路详解：每周执行手册

### {第1个月}：【{阶段名}】—— {一句话主题}
**月度视觉基调**：...
**核心目标**：...

#### Week 1：{主题简称} ({副标题})
**Slogan**："..."
**短视频 (抖音/快手/视频号)**
**运镜**：...
**画面**：...
**BGM**：...
**图文 (小红书/携程)**
**构图**：...
**文案**：标题《...》

#### Week 2：...
（同上结构）
#### Week 3：...
#### Week 4：...

### {第2个月}：【{阶段名}】—— {一句话主题}
（同上，4个Week，每个Week都有短视频+图文两个维度）

### {第3个月}：【{阶段名}】—— {一句话主题}
（同上，4个Week，每个Week都有短视频+图文两个维度）
` + "```" + `

# 关键规则
1. 以上骨架中用 {花括号} 标注的地方是你需要根据企业实际情况填写的内容
2. 每个月份必须有4个Week的完整运营内容
3. 表格和详解部分的内容必须对应一致
4. 所有Slogan、文案、画面描述必须是原创的、针对该企业定制的，不要照抄示例
5. 方案需要考虑当地的气候特征、旅游淡旺季规律、目标客群心理
6. 输出必须是完整的 Markdown 格式，可直接使用

请根据企业信息，按此骨架输出完整方案。`,
		},
		{
			Name:        "通用方案",
			Keywords:    []string{},
			Description: "通用方案设计模板，适用于任何类型的方案",
			Prompt: `你是一位专业的方案设计专家。请根据用户的需求，输出一份结构清晰、内容完整的方案文档。

# 输出格式要求
请使用 Markdown 格式输出。方案应包含以下核心要素（根据具体场景灵活调整）：

1. **背景与目标** — 阐述方案的背景、需要解决的问题、预期达成的目标
2. **现状分析** — 对相关领域进行分析，包括痛点和机会
3. **核心方案** — 详细的解决方案，分模块阐述
4. **执行计划** — 时间线、阶段性安排、关键里程碑
5. **资源需求** — 人力、预算、工具等
6. **风险评估** — 可能的风险和应对措施
7. **效果评估** — 如何衡量方案成果

请确保内容专业、逻辑严谨、实操性强。使用标题、列表、表格等 Markdown 元素使方案更清晰易读。`,
		},
	}
}

// matchSkill 根据用户消息匹配最合适的 skill
func (uc *CopywritingUseCase) matchSkill(message string, companyInfo string) *Skill {
	msg := strings.ToLower(message + " " + companyInfo)
	bestMatch := &uc.skills[len(uc.skills)-1] // default: 通用方案

	for i := range uc.skills {
		skill := &uc.skills[i]
		for _, keyword := range skill.Keywords {
			if strings.Contains(msg, strings.ToLower(keyword)) {
				return skill
			}
		}
	}
	return bestMatch
}

// isModifyRequest 判断用户是否在请求修改已有方案
func isModifyRequest(message string) bool {
	modifyKeywords := []string{"修改", "更新", "调整", "改一下", "改下", "优化", "完善", "补充", "重写", "改写"}
	msg := strings.ToLower(message)
	for _, keyword := range modifyKeywords {
		if strings.Contains(msg, keyword) {
			return true
		}
	}
	return false
}

// extractTitle 从 AI 生成的 markdown 内容中提取标题
func extractTitle(content string) string {
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			return strings.TrimPrefix(line, "# ")
		}
	}
	// 取前30个字符作为标题
	if len(content) > 30 {
		return content[:30] + "..."
	}
	return content
}

// getCopywritingDir 获取文案存储目录
func getCopywritingDir(companyID, sessionID int64) string {
	cfg := config.GetConfig()
	basePath := filepath.Dir(cfg.App.AssetsLibraryPath)
	return filepath.Join(basePath, "llm", "copywriting", fmt.Sprintf("%d", companyID), fmt.Sprintf("%d", sessionID))
}

// ======================== Session 管理 ========================

func (uc *CopywritingUseCase) CreateSession(ctx context.Context, session *entity.CopywritingSession) error {
	if session.Messages == nil {
		session.Messages = entity.ChatMessages{}
	}
	return uc.repo.CreateSession(ctx, session)
}

func (uc *CopywritingUseCase) GetSessionByID(ctx context.Context, id int64) (*entity.CopywritingSession, error) {
	return uc.repo.GetSessionByID(ctx, id)
}

func (uc *CopywritingUseCase) GetSessions(ctx context.Context, companyID int64, userID int64, page, pageSize int) (*entity.CopywritingSessionList, error) {
	sessions, total, err := uc.repo.GetSessionsWithPage(ctx, companyID, userID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &entity.CopywritingSessionList{
		Sessions: sessions,
		Total:    total,
		Page:     page,
		Size:     pageSize,
	}, nil
}

func (uc *CopywritingUseCase) DeleteSession(ctx context.Context, id int64) error {
	return uc.repo.DeleteSession(ctx, id)
}

// ======================== File 管理 ========================

func (uc *CopywritingUseCase) GetFilesBySessionID(ctx context.Context, sessionID int64) ([]*entity.CopywritingFile, error) {
	return uc.repo.GetFilesBySessionID(ctx, sessionID)
}

func (uc *CopywritingUseCase) GetFiles(ctx context.Context, companyID int64, userID int64, title string, page, pageSize int) (*entity.CopywritingFileList, error) {
	files, total, err := uc.repo.GetFilesWithPage(ctx, companyID, userID, title, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &entity.CopywritingFileList{
		Files: files,
		Total: total,
		Page:  page,
		Size:  pageSize,
	}, nil
}

func (uc *CopywritingUseCase) GetFileByID(ctx context.Context, id int64) (*entity.CopywritingFile, error) {
	return uc.repo.GetFileByID(ctx, id)
}

func (uc *CopywritingUseCase) UpdateFile(ctx context.Context, file *entity.CopywritingFile) error {
	// 同步更新磁盘文件
	if file.FilePath != "" && file.Content != "" {
		dir := filepath.Dir(file.FilePath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			uc.l.Error(fmt.Errorf("copywriting - UpdateFile - MkdirAll: %w", err))
		}
		if err := os.WriteFile(file.FilePath, []byte(file.Content), 0644); err != nil {
			uc.l.Error(fmt.Errorf("copywriting - UpdateFile - WriteFile: %w", err))
		}
	}
	return uc.repo.UpdateFile(ctx, file)
}

func (uc *CopywritingUseCase) DeleteFile(ctx context.Context, id int64) error {
	return uc.repo.DeleteFile(ctx, id)
}

func (uc *CopywritingUseCase) RecoverFile(ctx context.Context, id int64) error {
	return uc.repo.RecoverFile(ctx, id)
}

// ======================== 流式对话 ========================

// ChatStream 流式对话核心方法
func (uc *CopywritingUseCase) ChatStream(
	ctx context.Context,
	sessionID int64,
	userMessage string,
	modelID string,
	mode string,
	companyID int64,
	userID int64,
	companyInfo string,
	references []entity.ReferenceItem,
	onChunk func(chunk interface{}) error,
) error {
	// 1. 获取或创建会话
	var session *entity.CopywritingSession
	var err error

	if sessionID > 0 {
		session, err = uc.repo.GetSessionByID(ctx, sessionID)
		if err != nil {
			return fmt.Errorf("获取会话失败: %w", err)
		}
	} else {
		// 自动创建会话
		title := userMessage
		if len(title) > 50 {
			title = title[:50] + "..."
		}
		session = &entity.CopywritingSession{
			Title:     title,
			CompanyID: companyID,
			UserID:    userID,
			ModelID:   modelID,
			Mode:      mode,
			Messages:  entity.ChatMessages{},
		}
		if err := uc.repo.CreateSession(ctx, session); err != nil {
			return fmt.Errorf("创建会话失败: %w", err)
		}
	}

	// 1.1 余额校验
	if err := uc.billingCase.CheckBalance(ctx, companyID, modelID); err != nil {
		return err
	}

	// 2. 添加用户消息
	userMsg := entity.ChatMessage{
		Role:           "user",
		Content:        userMessage,
		Timestamp:      time.Now().Unix(),
		ReferenceItems: references,
	}
	session.Messages = append(session.Messages, userMsg)

	// 3. 匹配 skill 构建 system prompt
	skill := uc.matchSkill(userMessage, companyInfo)
	isModify := isModifyRequest(userMessage)

	systemPrompt := skill.Prompt
	if isModify {
		// 如果是修改请求，附加上下文
		existingFiles, _ := uc.repo.GetFilesBySessionID(ctx, session.ID)
		if len(existingFiles) > 0 {
			latestFile := existingFiles[0]
			systemPrompt += "\n\n# 已有方案内容（需要在此基础上修改）\n" + latestFile.Content
		}
	}

	if companyInfo != "" {
		systemPrompt += "\n\n" + companyInfo
	}

	// 4. 构建消息列表
	messages := []map[string]interface{}{
		{"role": "system", "content": systemPrompt},
	}

	// 添加历史消息（最近10轮）
	historyStart := 0
	if len(session.Messages) > 20 {
		historyStart = len(session.Messages) - 20
	}
	for _, msg := range session.Messages[historyStart:] {
		if msg.Role == "user" || msg.Role == "assistant" {
			content := msg.Content

			// 如果是 user 并且带参考资料，则拼接到上下文中以便大模型参考
			if msg.Role == "user" && len(msg.ReferenceItems) > 0 {
				var refParts []string
				for _, r := range msg.ReferenceItems {
					label := "参考资料"
					if r.Type == "file" {
						label = "参考文件「" + r.Name + "」"
					} else if r.Type == "material" {
						label = "参考文案「" + r.Name + "」"
					} else if r.Type == "clipboard" {
						label = "参考粘贴板内容"
					}
					refParts = append(refParts, label+":\n"+r.Content)
				}
				content = "【参考资料】\n" + strings.Join(refParts, "\n\n") + "\n\n【用户需求】\n" + content
			}

			messages = append(messages, map[string]interface{}{
				"role":    msg.Role,
				"content": content,
			})
		}
	}

	// 5. 更新 session 的 model/mode
	session.ModelID = modelID
	session.Mode = mode

	// 6. 流式调用 LLM
	var fullContent strings.Builder
	startTime := time.Now()

	usage, err := llm.ChatStream(ctx, modelID, messages, func(delta llm.StreamDelta) error {
		if delta.Content != "" || delta.ReasoningContent != "" {
			fullContent.WriteString(delta.Content)
			chunkType := "content"
			if delta.ReasoningContent != "" && delta.Content == "" {
				chunkType = "reasoning"
			}
			return onChunk(StreamChunk{
				Type:             chunkType,
				Content:          delta.Content,
				ReasoningContent: delta.ReasoningContent,
			})
		}
		// Always flush for empty deltas (could be metadata or just thinking)
		return onChunk(StreamChunk{Type: "ping"})
	})

	// 7. 处理 AI 回复，过滤正文，保存历史
	aiContent := fullContent.String()

	// 分割正文
	var documentContent string
	splitIndex := -1

	// 支持分割点的模式集合：\n# , \n## , \n---, \n1. , \n**
	patterns := []string{"\n#", "\n---", "\n1. ", "\n**"}
	for _, p := range patterns {
		if idx := strings.Index(aiContent, p); idx != -1 {
			if splitIndex == -1 || idx < splitIndex {
				splitIndex = idx
			}
		}
	}

	if splitIndex != -1 {
		documentContent = strings.TrimSpace(aiContent[splitIndex:])
	} else {
		// 如果没找到明显分割符，但开头就是标题
		documentContent = strings.TrimSpace(aiContent)
	}

	// 额外清理首尾的分割线 (如 ---)，支持多余的空格或不同数量的横杠
	reStart := regexp.MustCompile(`(?s)^\s*---+\s*\n*`)
	reEnd := regexp.MustCompile(`(?s)\n*\s*---+\s*$`)
	documentContent = reStart.ReplaceAllString(documentContent, "")
	documentContent = reEnd.ReplaceAllString(documentContent, "")
	documentContent = strings.TrimSpace(documentContent)

	// 7.1 扣除积分
	if usage != nil {
		durationMs := time.Since(startTime).Milliseconds()
		finishReason := "stop"
		if err != nil {
			finishReason = err.Error()
		}
		_, _ = uc.billingCase.DeductPoints(ctx, companyID, userID, session.ID, modelID, usage.PromptTokens, usage.CompletionTokens, durationMs, finishReason, documentContent)
	}

	if err != nil {
		_ = onChunk(StreamChunk{
			Type:    "error",
			Content: err.Error(),
		})
		return err
	}

	aiMsg := entity.ChatMessage{
		Role:      "assistant",
		Content:   aiContent,
		Timestamp: time.Now().Unix(),
	}

	// 8. 保存/更新文件 (仅保存 documentContent)
	title := extractTitle(documentContent)
	dir := getCopywritingDir(companyID, session.ID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		uc.l.Error(fmt.Errorf("copywriting - ChatStream - MkdirAll: %w", err))
	}

	if isModify {
		// 更新已有文件
		existingFiles, _ := uc.repo.GetFilesBySessionID(ctx, session.ID)
		if len(existingFiles) > 0 {
			file := existingFiles[0]
			file.Content = documentContent
			file.Title = title
			file.Version++

			fileName := fmt.Sprintf("%s_v%d.md", sanitizeFilename(title), file.Version)
			file.FilePath = filepath.Join(dir, fileName)

			if err := os.WriteFile(file.FilePath, []byte(documentContent), 0644); err != nil {
				uc.l.Error(fmt.Errorf("copywriting - ChatStream - WriteFile: %w", err))
			}

			if err := uc.repo.UpdateFile(ctx, file); err != nil {
				uc.l.Error(fmt.Errorf("copywriting - ChatStream - UpdateFile: %w", err))
			}

			aiMsg.FileID = file.ID
			_ = onChunk(StreamChunk{
				Type:   "file_updated",
				FileID: file.ID,
				Title:  title,
			})
		}
	} else {
		// 创建新文件
		fileName := fmt.Sprintf("%s.md", sanitizeFilename(title))
		filePath := filepath.Join(dir, fileName)

		if err := os.WriteFile(filePath, []byte(documentContent), 0644); err != nil {
			uc.l.Error(fmt.Errorf("copywriting - ChatStream - WriteFile: %w", err))
		}

		file := &entity.CopywritingFile{
			SessionID: session.ID,
			Title:     title,
			Content:   documentContent,
			FilePath:  filePath,
			CompanyID: companyID,
			UserID:    userID,
			Version:   1,
		}
		if err := uc.repo.CreateFile(ctx, file); err != nil {
			uc.l.Error(fmt.Errorf("copywriting - ChatStream - CreateFile: %w", err))
		}

		aiMsg.FileID = file.ID
		_ = onChunk(StreamChunk{
			Type:   "file_created",
			FileID: file.ID,
			Title:  title,
		})
	}

	// 9. 更新会话标题（第一条消息时）
	if len(session.Messages) <= 1 {
		session.Title = title
	}

	session.Messages = append(session.Messages, aiMsg)
	if err := uc.repo.UpdateSession(ctx, session); err != nil {
		uc.l.Error(fmt.Errorf("copywriting - ChatStream - UpdateSession: %w", err))
	}

	// 10. 发送完成信号
	_ = onChunk(StreamChunk{
		Type: "done",
	})

	return nil
}

// GetSkills 获取可用的 skills 列表
func (uc *CopywritingUseCase) GetSkills() []Skill {
	result := make([]Skill, len(uc.skills))
	for i, s := range uc.skills {
		result[i] = Skill{
			Name:        s.Name,
			Keywords:    s.Keywords,
			Description: s.Description,
		}
	}
	return result
}

// sanitizeFilename 清理文件名中的特殊字符
func sanitizeFilename(name string) string {
	replacer := strings.NewReplacer(
		"/", "_", "\\", "_", ":", "_", "*", "_",
		"?", "_", "\"", "_", "<", "_", ">", "_",
		"|", "_", "\n", "_", "\r", "_",
	)
	result := replacer.Replace(name)
	if len(result) > 100 {
		result = result[:100]
	}
	return result
}
