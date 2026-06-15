# SuperLink — AI GEO / AIEO 内容引擎

> [English](./README.md) | 简体中文

**SuperLink** 是一个可私有化部署的 **GEO（生成式引擎优化，Generative Engine Optimization）** 平台，也称 **AIEO（AI 引擎优化）**。它帮助品牌和创作者让自己的内容**被 AI 搜索引擎和大模型引用、推荐**（如 ChatGPT、Perplexity、豆包、Kimi 等）。

核心思路：当用户向 AI 提问时，AI 会基于它从全网吸收的内容来作答。SuperLink 围绕你的**目标关键词**生成高质量、对大模型友好的文章，并将其发布到一个**内容平台矩阵**中，从而提高 AI 在回答相关问题时引用你品牌的概率。

---

## ✨ 功能特性

### 🎯 GEO / AIEO 内容生成
- **用户问题挖掘**：根据关键词与目标词，由大模型生成用户最可能向 AI 提出的真实问题，让内容覆盖真正有价值的查询。
- **文章生成**：基于目标词、挖掘出的问题、**知识库**与**参考图片**，生成结构清晰、便于大模型吸收和引用的 Markdown 文章。
- **知识库 / 图片关联**：文章基于你自己的素材库与资产库生成，并在合适位置嵌入图片。
- **去重**：新文章会与历史文章摘要比对，避免重复。

### 🌐 多平台发布矩阵
将生成内容一键发布到丰富的国内外内容平台，最大化 AI 吸收面：

| 类型 | 平台 |
|---|---|
| **问答 / 博客** | 知乎、CSDN |
| **资讯 / 自媒体** | 今日头条、百家号、搜狐号、网易号、企鹅号、微信 |
| **视频 / 社交** | 哔哩哔哩、抖音、快手、小红书、TikTok |

- **发送任务**：支持按平台、按账号追踪收录状态（等待 / 收录成功 / 收录失败）。
- **视频任务**：将视频内容发布到社交平台。
- **登录上下文管理**：保存并复用各平台登录授权，发布即一键完成。

### ✍️ 文案 / 方案助手
- **流式对话式**（SSE）的方案策划 / 文案专家，支持思考过程输出。
- **技能模板**：面向垂直行业（如民宿 / 酒店运营）的模板，强制输出结构化、高质量方案。
- **文件管理**：每个会话内的文件版本化，支持恢复、更新、下载。

### 🤖 模型管理
- 管理多个 **LLM** 与 **embedding** 模型供应商及凭证（API Key / AK-SK）。
- 支持公司级**默认模型**、内置默认模型、连通性测试与**按 Token 计费**。

### 🏢 多租户与计费
- **公司 / 用户**管理，基于角色的访问控制与 JWT 鉴权。
- **余额、充值、交易流水、用量日志**，以及按模型用量的**积分计费**。

### 🖥️ 使用方式
- **REST API**（Fiber v2），可选 **Swagger** 文档与 **Prometheus** 指标。
- **桌面应用**（React + Electron），支持 Windows 和 macOS，内置打包 Go 后端。

---

## 🧱 技术栈

| 层级 | 技术 |
|---|---|
| 语言 | Go 1.25 |
| Web 框架 | [Fiber v2](https://github.com/gofiber/fiber) |
| 数据库 | MySQL 8（使用 `golang-migrate` 迁移） |
| 鉴权 | JWT |
| LLM 网关 | APIMart 兼容 API |
| 可观测性 | Prometheus 指标、zerolog / zap 日志 |
| 前端 | React + Electron（桌面端） |
| 架构 | 整洁架构（`entity` → `usecase` → `repo` → `controller`） |

项目结构：

```
cmd/app            # 应用入口
config/            # 基于环境变量的配置 + pricing.yaml
internal/
  controller/http  # Fiber 路由、中间件、请求/响应 DTO
  usecase/         # 业务逻辑（aieo_generate, copywriting, model, billing 等）
  repo/            # 持久层（MySQL / SQLite）
  entity/          # 领域实体
migrations/        # SQL 迁移脚本
pkg/               # 公共库（llm, logger, mysql, httpserver 等）
front/             # React + Electron 桌面应用
```

---

## 🚀 部署

### 方式 A —— Docker Compose（推荐）

一键启动 MySQL + SuperLink 后端。

```bash
# 1. 复制并编辑环境变量
cp .env.docker .env

# 2. 编辑 .env，至少需要设置：
#    APIMART_API_KEY   （你的 LLM API Key —— 必填）
#    JWT_SECRET        （改为强随机密钥）
#    MYSQL_ROOT_PASSWORD

# 3. 构建并启动
docker compose up -d --build

# 4. 查看状态 / 日志
docker compose ps
docker compose logs -f superlink
```

API 默认运行在 `http://localhost:8080`。MySQL 数据与上传的素材文件分别持久化在命名卷 `mysql_data`、`superlink_assets` 中。数据库迁移在首次启动时自动执行。

### 方式 B —— 本地源码运行

环境要求：**Go 1.25+**、可用的 **MySQL 8** 实例、`make`。

```bash
# 1. 配置环境变量
cp .env.docker .env
# 编辑 .env，将 MYSQL_URL 指向本地 MySQL，例如：
#   MYSQL_URL=root:password@tcp(127.0.0.1:3306)/geo?charset=utf8mb4&parseTime=True&loc=Local
# 同时设置 APIMART_API_KEY 与 JWT_SECRET。

# 2. 安装构建工具（golang-migrate、swag、mockgen 等）
make bin-deps

# 3. 执行数据库迁移
make migrate-up        # 需在 .env 中配置 MYSQL_MIGRATE_URL

# 4. 生成 Swagger 文档并启动服务
make run
```

`make run` 会重新整理依赖、生成 Swagger，并在 `HTTP_PORT`（默认 `8080`）启动 API。

### 方式 C —— 桌面应用（Electron）

`front/` 目录包含一个 React + Electron 应用，可将 Go 后端打包为单个桌面程序。

```bash
cd front
npm install

npm run dist-win      # 构建 Windows 安装包（后端 + UI）
npm run mac-ui        # 构建 macOS（arm64）纯 UI 包
```

构建产物输出到 `front/release/`。

---

## ⚙️ 配置说明

所有配置基于环境变量（完整列表见 `.env.docker`）。关键配置：

| 变量 | 说明 | 默认值 |
|---|---|---|
| `APIMART_API_KEY` | LLM 网关 API Key（**必填**） | — |
| `MYSQL_URL` | MySQL 连接串 | — |
| `HTTP_PORT` | API 监听端口 | `8080` |
| `JWT_SECRET` | JWT 签名密钥（**生产环境务必修改**） | — |
| `APP_HOST` | 应用对外访问地址 | `http://localhost:8080` |
| `APP_ASSETS_LIBRARY_PATH` | 上传素材的本地存储路径 | `./assets` |
| `LOG_LEVEL` | 日志级别（`debug`/`info`/...） | `info` |
| `METRICS_ENABLED` | 暴露 Prometheus 指标 | `true` |
| `SWAGGER_ENABLED` | 在 `/swagger/*` 暴露 Swagger UI | `false` |
| `DEBUG` | 调试模式 | `false` |

---

## 🔑 首次初始化

服务启动后：

1. 查询初始化状态 —— `GET /v1/auth/init`
2. 初始化系统（创建首个公司 + 管理员用户）—— `POST /v1/auth/init`
3. 登录 —— `POST /v1/auth/login`，返回 JWT
4. 配置 LLM 模型 —— `POST /v1/model` 并设为默认模型
5. （可选）添加平台登录上下文、上传素材，开始生成 AIEO 内容

> 当 `SWAGGER_ENABLED=true` 时，可在 `http://localhost:8080/swagger/index.html` 浏览完整 API。

---

## 📡 核心 API 分组

所有接口位于 `/v1` 下，主要包括：

- `/v1/auth` —— 系统初始化、登录
- `/v1/user`、`/v1/company` —— 用户、公司、余额、充值、用量日志
- `/v1/model` —— 模型增删改查、默认模型、连通性测试、定价
- `/v1/aieo_generate` —— 创建生成任务、挖掘用户问题、开始与追踪发布
- `/v1/copywriting` —— 对话会话（流式）、文件、技能
- `/v1/video_job` —— 视频发布任务
- `/v1/assets_library`、`/v1/material_library` —— 资产（图片/视频）与知识库
- `/v1/website_login_context` —— 各平台登录授权

---

## 🛠️ 开发

```bash
make deps              # 整理并校验依赖
make swag-v1           # 重新生成 Swagger 文档
make mock              # 重新生成 mock
make format            # gofumpt + gci 格式化
make linter-golangci   # 代码检查
make test              # 单元测试（race + 覆盖率）
make integration-test  # 集成测试
make pre-commit        # 运行完整的 pre-commit 流程
```

---

## 📄 许可证

许可证详情见仓库说明。
