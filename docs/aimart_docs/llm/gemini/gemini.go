package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	// 定义要调用的模型列表
	models := []struct {
		ID   string
		Name string
	}{
		{"gemini-2.5-flash", "Gemini 2.5 快速版"},
		{"gemini-2.5-pro", "Gemini 2.5 专业版"},
		{"gemini-2.5-flash-lite", "Gemini 2.5 超轻量版"},
		{"gemini-2.5-pro-thinking", "Gemini 2.5 Pro 深度思考版"},
	}

	for _, m := range models {
		fmt.Printf(">>> 正在调用模型: %s (%s)\n", m.ID, m.Name)
		if err := callGeminiGenerateContent(m.ID); err != nil {
			fmt.Printf("调用模型 %s 出错: %v\n", m.ID, err)
		}
		fmt.Println("--------------------------------------------------")
	}
}

// callGeminiGenerateContent 封装了调用 Gemini API 的逻辑
func callGeminiGenerateContent(modelID string) error {
	url := fmt.Sprintf("https://api.apimart.ai/v1beta/models/%s:generateContent", modelID)

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"role": "user",
				"parts": []map[string]interface{}{
					{
						"text": "你好，介绍一下自己",
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload error: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("create request error: %w", err)
	}

	token := os.Getenv("APIMART_API_KEY") // 从 .env 环境变量 APIMART_API_KEY 中读取
	if token == "" {
		return fmt.Errorf("环境变量 APIMART_API_KEY 未设置")
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("execute request error: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response body error: %w", err)
	}

	fmt.Printf("模型响应: %s\n", string(body))
	return nil
}
