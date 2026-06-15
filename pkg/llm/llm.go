package llm

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/kakj-go/llm_reference_matrix/config"
)

type ModelInfo struct {
	ApiEndpointHost string
	EndpointID      string
	ModelName       string
	BaseModel       string
	ApiKey          string
	MaxToken        int64
	Temperature     float64
}

type TokenUsage struct {
	CompletionTokens int `json:"completion_tokens"`
	PromptTokens     int `json:"prompt_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// APIMartResponse represents the response from APIMart's unified chat completion API
type APIMartResponse struct {
	Code int `json:"code"`
	// APIMart structure
	Data struct {
		Choices []Choice `json:"choices"`
		Usage   Usage    `json:"usage"`
	} `json:"data"`

	// OpenAI legacy structure (fallback)
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage"`
}

type Choice struct {
	FinishReason string `json:"finish_reason"`
	Index        int    `json:"index"`
	Message      struct {
		Content string `json:"content"`
		Role    string `json:"role"`
	} `json:"message"`
}

type Usage struct {
	CompletionTokens int `json:"completion_tokens"`
	PromptTokens     int `json:"prompt_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

func Chat(ctx context.Context, model *ModelInfo, prompt string, user string) (string, *TokenUsage, error) {
	url := "https://api.apimart.ai/v1/chat/completions"

	// Get API Key from config
	apiKey := config.GetConfig().APIMart.ApiKey
	if apiKey == "" {
		apiKey = model.ApiKey // Fallback to model.ApiKey if config is empty
	}

	messages := []map[string]interface{}{}
	if prompt != "" {
		messages = append(messages, map[string]interface{}{
			"role":    "system",
			"content": prompt,
		})
	}

	// APIMart (and many upstream models like Claude) require:
	// 1. At least one message
	// 2. The messages must be non-empty
	// 3. Usually, the last message must be from the user

	userMsg := user
	if userMsg == "" {
		// If user content is empty, but we have a prompt,
		// some models still require a following user message.
		userMsg = "Summarize the above."
	}

	messages = append(messages, map[string]interface{}{
		"role":    "user",
		"content": userMsg,
	})

	reqBody := map[string]interface{}{
		"model": func() string {
			if model.EndpointID != "" {
				return model.EndpointID
			}
			if model.ModelName != "" {
				return model.ModelName
			}
			return model.BaseModel
		}(),
		"max_tokens":  model.MaxToken,
		"temperature": model.Temperature,
		"stream":      false, // Explicitly disable streaming
		"messages":    messages,
	}

	reqBodyJson, err := json.Marshal(reqBody)
	if err != nil {
		return "", nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(string(reqBodyJson)))
	if err != nil {
		return "", nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 180 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", nil, fmt.Errorf("APIMart连接超时: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("APIMart连接失败 (HTTP %d): %s", resp.StatusCode, string(body))
	}

	chatResp := APIMartResponse{}
	err = json.Unmarshal(body, &chatResp)
	if err != nil {
		return "", nil, fmt.Errorf("解析APIMart响应失败 (Body: %s): %w", string(body), err)
	}

	// Determine resulting choices and usage (APIMart format vs OpenAI format)
	var finalChoices []Choice
	var finalUsage Usage

	if len(chatResp.Data.Choices) > 0 {
		finalChoices = chatResp.Data.Choices
		finalUsage = chatResp.Data.Usage
	} else {
		finalChoices = chatResp.Choices
		finalUsage = chatResp.Usage
	}

	// APIMart sometimes returns 200 OK but with direct OpenAI format (no code/data wrapper)
	if chatResp.Code != 0 && chatResp.Code != 200 {
		return "", nil, fmt.Errorf("APIMart返回错误 (Code %d, Body: %s)", chatResp.Code, string(body))
	}

	if len(finalChoices) == 0 {
		return "", nil, fmt.Errorf("APIMart响应中没有choices字段 (Body: %s)", string(body))
	}

	usage := &TokenUsage{
		CompletionTokens: finalUsage.CompletionTokens,
		PromptTokens:     finalUsage.PromptTokens,
		TotalTokens:      finalUsage.TotalTokens,
	}

	content := finalChoices[0].Message.Content
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	return content, usage, nil
}

// StreamDelta represents a streaming chunk from SSE
type StreamDelta struct {
	Content          string `json:"content"`
	ReasoningContent string `json:"reasoning_content,omitempty"`
	FinishReason     string `json:"finish_reason,omitempty"`
}

// streamChoice is used to parse SSE streaming response chunks
type streamChoice struct {
	Index int `json:"index"`
	Delta struct {
		Role             string `json:"role,omitempty"`
		Content          string `json:"content,omitempty"`
		ReasoningContent string `json:"reasoning_content,omitempty"`
	} `json:"delta"`
	FinishReason *string `json:"finish_reason,omitempty"`
}

type streamChunkResponse struct {
	// APIMart wrapper
	Code int `json:"code,omitempty"`
	Data struct {
		Choices []streamChoice `json:"choices,omitempty"`
		Usage   *Usage         `json:"usage,omitempty"`
	} `json:"data,omitempty"`
	// Direct OpenAI format
	Choices []streamChoice `json:"choices,omitempty"`
	Usage   *Usage         `json:"usage,omitempty"`
}

// ChatStream performs a streaming chat completion call.
// messages should be the full conversation history as []map[string]interface{} with "role" and "content".
// onChunk is called for each content delta received; return an error to abort.
func ChatStream(ctx context.Context, modelName string, messages []map[string]interface{}, onChunk func(delta StreamDelta) error) (*TokenUsage, error) {
	url := "https://api.apimart.ai/v1/chat/completions"

	apiKey := config.GetConfig().APIMart.ApiKey
	if apiKey == "" {
		return nil, fmt.Errorf("APIMart API Key 未配置")
	}

	reqBody := map[string]interface{}{
		"model":  modelName,
		"stream": true,
		"stream_options": map[string]interface{}{
			"include_usage": true,
		},
		"messages": messages,
	}

	reqBodyJson, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(string(reqBodyJson)))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("APIMart连接失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("APIMart连接失败 (HTTP %d): %s", resp.StatusCode, string(body))
	}

	var finalUsage *TokenUsage
	reader := bufio.NewReader(resp.Body)

	doneSeen := false
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return finalUsage, fmt.Errorf("读取SSE流失败: %w", err)
		}

		// Skip empty lines and comments
		if line == "" || line == "\r" {
			continue
		}

		// SSE format: "data: {...}"
		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		data = strings.TrimSpace(data)

		// Check for stream end
		if data == "[DONE]" {
			doneSeen = true
			break
		}

		var chunk streamChunkResponse
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			// Skip unparseable lines
			continue
		}

		// Determine choices from APIMart wrapper or direct format
		choices := chunk.Data.Choices
		if len(choices) == 0 {
			choices = chunk.Choices
		}

		// Extract usage if present
		usage := chunk.Data.Usage
		if usage == nil {
			usage = chunk.Usage
		}
		if usage != nil {
			finalUsage = &TokenUsage{
				CompletionTokens: usage.CompletionTokens,
				PromptTokens:     usage.PromptTokens,
				TotalTokens:      usage.TotalTokens,
			}
		}

		if len(choices) > 0 {
			delta := StreamDelta{
				Content:          choices[0].Delta.Content,
				ReasoningContent: choices[0].Delta.ReasoningContent,
			}
			if choices[0].FinishReason != nil {
				delta.FinishReason = *choices[0].FinishReason
			}

			if err := onChunk(delta); err != nil {
				return finalUsage, err
			}
		}
	}

	if !doneSeen {
		return finalUsage, fmt.Errorf("流意外中断")
	}

	return finalUsage, nil
}
