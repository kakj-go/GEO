# SuperLink — AI GEO / AIEO Content Engine

> English | [简体中文](./README_CN.md)

**SuperLink** is a self-hostable platform for **GEO (Generative Engine Optimization)** — also called **AIEO (AI Engine Optimization)**. It helps brands and creators get **cited and recommended by AI search engines and large language models** (ChatGPT, Perplexity, Doubao, Kimi, etc.).

The core idea: when users ask an AI a question, the AI answers from content it has ingested across the web. SuperLink generates high-quality, LLM-friendly articles around your **target keywords**, then publishes them across a **matrix of content platforms** so that AI models are more likely to reference your brand when answering related questions.

---

## ✨ Features

### 🎯 GEO / AIEO Content Generation
- **User-question mining** — Given a keyword and a target word, the LLM generates the real questions users are likely to ask an AI, so your content covers the queries that matter.
- **Article generation** — Produces clean, structured Markdown articles from your target words, mined questions, a **knowledge base**, and **reference images**, designed to be easily ingested and quoted by LLMs.
- **Knowledge-base & image grounding** — Articles are grounded on your own material library and asset library, with images embedded at the right positions.
- **Deduplication** — New articles are checked against previously generated synopses to avoid repetition.

### 🌐 Multi-Platform Publishing Matrix
Publish generated content across a wide range of Chinese and international content platforms to maximize AI ingestion surface:

| | Platforms |
|---|---|
| **Q&A / Blog** | Zhihu (知乎), CSDN |
| **News / Self-media** | Toutiao (今日头条), Baijiahao (百家号), Sohu (搜狐号), NetEase (网易号), Qi'e (企鹅号), WeChat (微信) |
| **Video / Social** | Bilibili, Douyin (抖音), Kuaishou (快手), Xiaohongshu (小红书), TikTok |

- **Send tasks** with per-platform, per-account delivery status tracking (Waiting / Success / Failed).
- **Video jobs** for publishing video content to social platforms.
- **Login-context management** — store and reuse per-platform login authorizations so publishing is one click.

### ✍️ Copywriting Assistant
- **Streaming, chat-based** planning/copywriting expert (SSE) with reasoning output.
- **Skill templates** for vertical industries (e.g. homestay/hotel operations) that enforce structured, high-quality plan output.
- **File management** — versioned files per session, with recover, update, download.

### 🤖 Model Management
- Manage multiple **LLM** and **embedding** model providers and credentials (API key / AK-SK).
- Per-company **default model**, built-in default models, connectivity testing, and **token-based pricing**.

### 🏢 Multi-Tenant & Billing
- **Company / user** management with role-based access and JWT auth.
- **Balance, recharge, transactions, usage logs**, and detailed **points-based billing** per model usage.

### 🖥️ Interfaces
- **REST API** (Fiber v2) with optional **Swagger** docs and **Prometheus** metrics.
- **Desktop app** (React + Electron) for Windows and macOS that bundles the Go backend.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Language | Go 1.25 |
| Web framework | [Fiber v2](https://github.com/gofiber/fiber) |
| Database | MySQL 8 (with `golang-migrate` migrations) |
| Auth | JWT |
| LLM gateway | APIMart-compatible API |
| Observability | Prometheus metrics, zerolog / zap logging |
| Frontend | React + Electron (desktop) |
| Architecture | Clean Architecture (`entity` → `usecase` → `repo` → `controller`) |

Project layout:

```
cmd/app            # application entrypoint
config/            # env-based configuration + pricing.yaml
internal/
  controller/http  # Fiber routes, middleware, request/response DTOs
  usecase/         # business logic (aieo_generate, copywriting, model, billing, ...)
  repo/            # persistence (MySQL / SQLite)
  entity/          # domain entities
migrations/        # SQL migrations
pkg/               # shared libraries (llm, logger, mysql, httpserver, ...)
front/             # React + Electron desktop app
```

---

## 🚀 Deployment

### Option A — Docker Compose (recommended)

Spins up MySQL + the SuperLink API together.

```bash
# 1. Copy and edit environment variables
cp .env.docker .env

# 2. Edit .env — at minimum set:
#    APIMART_API_KEY   (your LLM API key — required)
#    JWT_SECRET        (change to a strong secret)
#    MYSQL_ROOT_PASSWORD

# 3. Build and start
docker compose up -d --build

# 4. Check status / logs
docker compose ps
docker compose logs -f superlink
```

The API will be available at `http://localhost:8080`. MySQL data and uploaded assets are persisted in named Docker volumes (`mysql_data`, `superlink_assets`). Database migrations run automatically on first start.

### Option B — Run locally from source

Requirements: **Go 1.25+**, a running **MySQL 8** instance, and `make`.

```bash
# 1. Configure environment
cp .env.docker .env
# Edit .env and set MYSQL_URL to your local MySQL, e.g.:
#   MYSQL_URL=root:password@tcp(127.0.0.1:3306)/geo?charset=utf8mb4&parseTime=True&loc=Local
# Also set APIMART_API_KEY and JWT_SECRET.

# 2. Install build tools (golang-migrate, swag, mockgen, ...)
make bin-deps

# 3. Run migrations
make migrate-up        # requires MYSQL_MIGRATE_URL in .env

# 4. Generate Swagger docs and run the server
make run
```

`make run` regenerates dependencies + Swagger and starts the API on `HTTP_PORT` (default `8080`).

### Option C — Desktop app (Electron)

The `front/` directory contains a React + Electron app that bundles the Go backend into a single desktop application.

```bash
cd front
npm install

npm run dist-win      # build a Windows installer (backend + UI)
npm run mac-ui        # build a macOS (arm64) UI-only package
```

Output installers are written to `front/release/`.

---

## ⚙️ Configuration

All configuration is environment-variable based (see `.env.docker` for the full list). Key settings:

| Variable | Description | Default |
|---|---|---|
| `APIMART_API_KEY` | LLM gateway API key (**required**) | — |
| `MYSQL_URL` | MySQL DSN | — |
| `HTTP_PORT` | API listen port | `8080` |
| `JWT_SECRET` | JWT signing secret (**change in production**) | — |
| `APP_HOST` | Public base URL of the app | `http://localhost:8080` |
| `APP_ASSETS_LIBRARY_PATH` | Local path for uploaded assets | `./assets` |
| `LOG_LEVEL` | Log level (`debug`/`info`/...) | `info` |
| `METRICS_ENABLED` | Expose Prometheus metrics | `true` |
| `SWAGGER_ENABLED` | Expose Swagger UI at `/swagger/*` | `false` |
| `DEBUG` | Debug mode | `false` |

---

## 🔑 First-Time Setup

After the service is running:

1. Check init status — `GET /v1/auth/init`
2. Initialize the system (creates the first company + admin user) — `POST /v1/auth/init`
3. Log in — `POST /v1/auth/login` → returns a JWT
4. Configure an LLM model — `POST /v1/model` and set it as default
5. (Optional) Add platform login contexts, upload assets, and start generating AIEO content

> When `SWAGGER_ENABLED=true`, browse the full API at `http://localhost:8080/swagger/index.html`.

---

## 📡 Core API Groups

All endpoints are under `/v1`. Highlights:

- `/v1/auth` — system init, login
- `/v1/user`, `/v1/company` — users, companies, balance, recharge, usage logs
- `/v1/model` — model CRUD, default model, connectivity test, pricing
- `/v1/aieo_generate` — create generation tasks, mine user questions, start/track publishing
- `/v1/copywriting` — chat sessions (streaming), files, skills
- `/v1/video_job` — video publishing tasks
- `/v1/assets_library`, `/v1/material_library` — assets (images/video) and knowledge base
- `/v1/website_login_context` — per-platform login authorizations

---

## 🛠️ Development

```bash
make deps              # tidy + verify modules
make swag-v1           # regenerate Swagger docs
make mock              # regenerate mocks
make format            # gofumpt + gci
make linter-golangci   # lint
make test              # unit tests (race + coverage)
make integration-test  # integration tests
make pre-commit        # run the full pre-commit pipeline
```

---

## 📄 License

See the repository for license details.
