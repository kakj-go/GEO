-- Add Billing Tables
CREATE TABLE IF NOT EXISTS transaction_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'recharge', 'adjustment', 'consumption'
    amount BIGINT NOT NULL, -- points (integer, 1 Point = 1,000,000 DB units)
    balance_before BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    order_id VARCHAR(100) UNIQUE,
    payment_method VARCHAR(50),
    remark TEXT,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    session_id BIGINT,
    model_id VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    points BIGINT NOT NULL, -- charge in points (converted from DB units)
    duration_ms BIGINT,
    throughput FLOAT, -- tokens/s
    finish_reason VARCHAR(50),
    content_preview TEXT,
    created_at BIGINT NOT NULL
);
