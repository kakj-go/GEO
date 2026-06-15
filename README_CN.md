# SuperLink — AI GEO / AIEO 桌面应用

> [English](./README.md) | 简体中文

**SuperLink** 是一款用于 **GEO（生成式引擎优化，Generative Engine Optimization）** 的桌面应用，也称 **AIEO（AI 引擎优化）**。它帮助品牌和创作者让自己的内容**被 AI 搜索引擎和大模型引用、推荐**（如 ChatGPT、Perplexity、豆包、Kimi 等）。

核心思路：当用户向 AI 提问时，AI 会基于它从全网吸收的内容来作答。SuperLink 围绕你的**目标关键词**生成高质量、对大模型友好的文章，并发布到一个**内容平台矩阵**中，从而提高 AI 在回答相关问题时引用你品牌的概率。

---

## ✨ 功能特性

- **GEO / AIEO 内容生成**：挖掘用户向 AI 提出的真实问题，再基于你的知识库与图片，生成结构清晰、对大模型友好的 Markdown 文章。
- **多平台发布矩阵**：一键发布到知乎、今日头条、百家号、搜狐号、网易号、企鹅号、微信、CSDN、哔哩哔哩、抖音、快手、小红书、TikTok，并按平台 / 账号追踪收录状态。
- **文案助手**：流式对话式的方案策划 / 文案专家，内置行业技能模板，文件版本化管理。
- **模型管理**：添加你自己的 LLM / embedding 供应商，设为默认、测试连通性、按 Token 统计用量。
- **开箱即用**：内置后端与嵌入式数据库，无需额外安装任何环境。

---

## ⬇️ 下载与安装

前往 **[Releases 页面](https://github.com/kakj-go/GEO/releases/latest)** 下载最新安装包：

| 平台 | 文件 |
|---|---|
| 🪟 **Windows** | `SuperLink Setup x.y.z.exe` |
| 🍎 **macOS（Apple 芯片）** | `SuperLink-x.y.z-arm64.dmg` |
| 🍎 **macOS（Intel 芯片）** | `SuperLink-x.y.z.dmg` |

**Windows**：运行 `.exe`，选择安装位置并完成安装，会自动创建桌面 / 开始菜单快捷方式。

**macOS**：打开 `.dmg`，将 **SuperLink** 拖入 **应用程序（Applications）**。

> 安装包**未做代码签名**，首次启动会有安全提示：
> - **Windows**：SmartScreen → *更多信息* → *仍要运行*。
> - **macOS**：右键点击应用 → **打开** → **打开**（或在*系统设置 ▸ 隐私与安全性 ▸ 仍要打开*中允许）。

---

## 🚀 首次使用

应用会**自动启动内置后端**——无需 MySQL、无需搭建服务器。数据保存在本地的嵌入式 SQLite 数据库中（`database/data.db`，位于应用资源目录旁）。

> 🔑 **默认登录账号** —— 用户名 **`root`**，密码 **`123456`**。首次登录后请及时修改密码。

1. **启动** SuperLink。
2. 使用默认账号 `root` / `123456` **登录**（或初始化系统，创建你自己的公司与管理员账号）。
3. 在用户设置中**修改默认密码**。
4. 在「**模型管理器**」中**填写 APIMart API Key**。内置模型统一通过 [APIMart](https://apimart.ai/) 调用——粘贴 Key 点击保存，所有 AI 功能即可使用，**无需配置任何环境变量**。还没有 Key？前往 **https://apimart.ai/** 获取。
5. 在模型管理器中**选择默认模型**（文本 / 文生图 / 文生视频）。
6. （可选）**添加平台登录授权**，以便发布——每个目标平台授权一次即可。
7. **生成并发布**：根据关键词创建 GEO 任务，检查生成的文章，再发送到所选平台。

> 所有配置（APIMart Key、模型、平台登录）都在**应用内**完成，完全不需要配置环境变量。

---

## ⚙️ 环境变量（可选）

SuperLink 开箱即用，**APIMart Key 在应用内（模型管理器）配置**，因此通常**无需任何环境变量**。环境变量仅用于进阶调整。内置后端会**继承操作系统的环境变量**，因此需要在**启动应用之前**在操作系统层面设置好。

| 变量 | 说明 | 默认值 |
|---|---|---|
| `APIMART_API_KEY` | 内置 APIMart 网关的兜底 API Key（[点此获取](https://apimart.ai/)）。可选——模型管理器中填写的 Key 优先级更高，此变量仅作兜底。 | — |
| `JWT_SECRET` | 用于签发登录令牌的密钥。 | 内置默认值 |
| `LOG_LEVEL` | 日志级别：`debug` / `info` / `warn` / `error`。 | `info` |
| `SWAGGER_ENABLED` | 在 `http://localhost:8080/swagger/index.html` 暴露 API 文档。 | `false` |
| `METRICS_ENABLED` | 暴露 Prometheus 指标。 | `true` |
| `DEBUG` | 启用调试模式。 | `false` |

> ⚠️ 请**不要修改 `HTTP_PORT`**。桌面端 UI 固定通过 `localhost:8080` 访问后端，修改端口会导致应用无法使用。

### 如何设置

**Windows**（设置用户级变量后重启应用）：

```powershell
# PowerShell —— 持久化到当前用户
setx APIMART_API_KEY "你的-key"
setx LOG_LEVEL "debug"
# 关闭并重新打开 SuperLink 使其生效。
```

也可通过 **设置 ▸ 系统 ▸ 关于 ▸ 高级系统设置 ▸ 环境变量** 进行配置。

**macOS**（启动时携带环境变量，例如从终端启动）：

```bash
APIMART_API_KEY="你的-key" LOG_LEVEL="debug" \
  open -a SuperLink
```

若需永久生效，可将 `export` 语句加入 shell 配置文件（`~/.zshrc`），或使用 `launchctl setenv`，然后重新启动应用。

---

## 🩺 故障排查

- **AI 功能无反应 / 报错**：请确认已在「模型管理」中配置模型且连通性测试通过（或已设置 `APIMART_API_KEY`）。
- **日志**：排查问题时可查看运行日志：
  - **Windows**：`%APPDATA%\superlink\logs\run.log`
  - **macOS**：`~/Library/Application Support/superlink/logs/run.log`
- **重置所有数据**：退出应用并删除本地的 `database/data.db`（会清空所有本地数据）。

---

## 🧑‍💻 从源码构建

桌面安装包的构建（以及需要 macOS 环境的 mac 构建）已通过 GitHub Actions 在打 tag 时自动完成，详见 [.github/workflows/release.yml](.github/workflows/release.yml)。本地构建 Windows 应用：

```bash
cd front
npm install
npm run dist-win     # → front/release/
```

---

## 📄 许可证

许可证详情见仓库说明。
