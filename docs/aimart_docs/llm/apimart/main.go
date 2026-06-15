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

	url := "https://api.apimart.ai/v1/chat/completions"
	token := os.Getenv("APIMART_API_KEY") // 从 .env 环境变量 APIMART_API_KEY 中读取
	if token == "" {
		fmt.Println("Error: 环境变量 APIMART_API_KEY 未设置")
		return
	}

	//models := []string{
	//	// OpenAI
	//	"gpt-5", "gpt-5-chat-latest", "gpt-5-mini", "gpt-5-nano", "gpt-5-pro",
	//	// Anthropic
	//	"claude-sonnet-4-5-20250929", "claude-opus-4-1-20250805", "claude-haiku-4-5-20251001", "claude-opus-4-1-20250805-thinking", "claude-sonnet-4-5-20250929-thinking",
	//	// Google
	//	"gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-pro-thinking", "gemini-2.5-flash-lite",
	//	// DeepSeek
	//	"deepseek-v3.1-250821", "deepseek-v3.1-think-250821", "deepseek-v3-0324",
	//	// Doubao
	//	"doubao-seed-1-6-251015", "doubao-seed-1-6-flash-250828", "doubao-seed-1-6-thinking-250715",
	//}

	models := []string{
		// OpenAI
		"gpt-5-chat-latest", "gpt-5-pro",
		// Anthropic
		"claude-opus-4-1-20250805", "claude-opus-4-1-20250805-thinking",
		// DeepSeek
		"deepseek-v3.1-250821", "deepseek-v3.1-think-250821",
		// Doubao
		"doubao-seed-1-6-251015", "doubao-seed-1-6-flash-250828", "doubao-seed-1-6-thinking-250715",
	}

	for _, model := range models {
		fmt.Printf("--- Calling model: %s ---\n", model)

		payload := map[string]interface{}{
			"model": model,
			"messages": []map[string]string{
				{
					"role":    "system",
					"content": "你是一个专业的AI助手。",
				},
				{
					"role":    "user",
					"content": "你好，请简单介绍一下你自己。",
				},
			},
		}

		jsonData, err := json.Marshal(payload)
		if err != nil {
			fmt.Printf("Error marshaling payload for %s: %v\n", model, err)
			continue
		}

		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			fmt.Printf("Error creating request for %s: %v\n", model, err)
			continue
		}

		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("Error executing request for %s: %v\n", model, err)
			continue
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Printf("Error reading response for %s: %v\n", model, err)
			continue
		}

		fmt.Printf("Response for %s: %s\n\n", model, string(body))
	}
}
