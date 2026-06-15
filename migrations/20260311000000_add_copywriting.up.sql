-- 方案设计专家：会话表
CREATE TABLE IF NOT EXISTS copywriting_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    model_id VARCHAR(255) NOT NULL DEFAULT '',
    mode VARCHAR(20) NOT NULL DEFAULT 'quick',
    messages JSON NOT NULL DEFAULT '[]',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- 方案设计专家：文件表
CREATE TABLE IF NOT EXISTS copywriting_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id BIGINT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    file_path VARCHAR(512) NOT NULL DEFAULT '',
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);
