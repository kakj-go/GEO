package markdown

import (
	"regexp"
	"strings"
)

// Operation 表示富文本编辑器的一个操作
type Operation struct {
	Type  string `json:"type"`
	Value string `json:"value,omitempty"`
	Name  string `json:"name,omitempty"`
}

// ParseMarkdownToOperations 将Markdown解析为操作序列
func ParseMarkdownToOperations(markdown string) ([]Operation, error) {
	var operations []Operation

	// 分割为行
	lines := strings.Split(markdown, "\n")

	// 用于跟踪前一个操作类型，避免连续多个换行
	lastType := ""

	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			// 空行，添加换行（避免连续多个换行）
			if lastType != "line_break" && lastType != "" {
				operations = append(operations, Operation{Type: "line_break"})
				lastType = "line_break"
			}
			continue
		}

		// 检查是否为标题
		if strings.HasPrefix(line, "# ") {
			// 一级标题
			title := strings.TrimPrefix(line, "# ")
			// 检查下一行是否是标题的描述
			if i+1 < len(lines) && !isSpecialLine(strings.TrimSpace(lines[i+1])) {
				nextLine := strings.TrimSpace(lines[i+1])
				if nextLine != "" {
					fullTitle := title
					if !strings.Contains(title, nextLine) {
						if strings.HasSuffix(title, ":") || strings.HasSuffix(title, "：") {
							fullTitle = title + " " + nextLine
						} else {
							fullTitle = title + "：" + nextLine
						}
					}
					operations = append(operations, Operation{
						Type:  "add_title",
						Value: fullTitle,
					})
					operations = append(operations, Operation{Type: "line_break"})

					// 单独添加描述内容
					operations = append(operations, Operation{
						Type:  "add_content",
						Value: nextLine,
					})
					operations = append(operations, Operation{Type: "line_break"})
					i++ // 跳过已处理的行
					lastType = "line_break"
					continue
				}
			}

			operations = append(operations, Operation{
				Type:  "add_title",
				Value: title,
			})
			operations = append(operations, Operation{Type: "line_break"})
			lastType = "line_break"

		} else if strings.HasPrefix(line, "## ") {
			// 二级标题
			title := strings.TrimPrefix(line, "## ")
			operations = append(operations, Operation{
				Type:  "add_title",
				Value: title,
			})
			operations = append(operations, Operation{Type: "line_break"})
			lastType = "line_break"

		} else if strings.HasPrefix(line, "![") {
			// 图片
			re := regexp.MustCompile(`!\[(.*?)\]\((.*?)\)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) == 3 {
				name := matches[1]
				url := matches[2]
				// 提取基础URL（去掉文件名部分）
				baseURL := url
				//if lastSlash := strings.LastIndex(url, "/"); lastSlash != -1 {
				//	baseURL = url[:lastSlash+1]
				//}

				operations = append(operations, Operation{
					Type:  "add_image",
					Value: baseURL,
					Name:  name,
				})
				operations = append(operations, Operation{Type: "line_break"})
				lastType = "line_break"
			}

		} else if strings.HasPrefix(line, "- ") || strings.HasPrefix(line, "* ") {
			// 无序列表
			listItem := strings.TrimPrefix(strings.TrimPrefix(line, "- "), "* ")
			operations = append(operations, Operation{
				Type:  "add_content",
				Value: "• " + listItem,
			})
			operations = append(operations, Operation{Type: "line_break"})
			lastType = "line_break"

		} else if matches, _ := regexp.MatchString(`^\d+\.\s`, line); matches {
			// 有序列表
			re := regexp.MustCompile(`^\d+\.\s(.*)`)
			matches := re.FindStringSubmatch(line)
			if len(matches) == 2 {
				operations = append(operations, Operation{
					Type:  "add_content",
					Value: matches[1],
				})
				operations = append(operations, Operation{Type: "line_break"})
				lastType = "line_break"
			}

		} else {
			// 普通文本内容
			operations = append(operations, Operation{
				Type:  "add_content",
				Value: line,
			})
			operations = append(operations, Operation{Type: "line_break"})
			lastType = "line_break"
		}
	}

	// 移除最后一个多余的换行
	if len(operations) > 0 && operations[len(operations)-1].Type == "line_break" {
		operations = operations[:len(operations)-1]
	}

	return operations, nil
}

// isSpecialLine 判断是否为特殊行（标题、图片等）
func isSpecialLine(line string) bool {
	return strings.HasPrefix(line, "# ") ||
		strings.HasPrefix(line, "## ") ||
		strings.HasPrefix(line, "![") ||
		strings.HasPrefix(line, "- ") ||
		strings.HasPrefix(line, "* ") ||
		regexp.MustCompile(`^\d+\.\s`).MatchString(line)
}

//func main() {
//	markdown := `# 青岛阿旭寿司
//日式正宗与本地风味碰撞的美味选择
//
//好美味
//
//## 新鲜食材是美味的底气
//每天清晨，阿旭寿司都会从本地海鲜市场和进口供应商处采购最新鲜的原料：挪威三文鱼纹理清晰油脂丰富，冰鲜金枪鱼直达餐桌锁住鲜味，本地大虾、扇贝等海鲜更是当天现剥现用，确保每款寿司都带着海洋的鲜活气息。
//
//![测试](http://localhost:8080/images/202511/724d065c-7ffe-4932-9449-7c2c0edeacdb.jpg)`
//
//	operations, err := ParseMarkdownToOperations(markdown)
//	if err != nil {
//		fmt.Println("Error:", err)
//		return
//	}
//
//	jsonData, err := json.MarshalIndent(operations, "", " ")
//	if err != nil {
//		fmt.Println("Error marshaling to JSON:", err)
//		return
//	}
//
//	fmt.Println(string(jsonData))
//}
