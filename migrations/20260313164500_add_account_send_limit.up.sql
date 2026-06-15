-- Add daily_limit and today_count fields to website_login_context table
ALTER TABLE website_login_contexts ADD COLUMN daily_limit INTEGER DEFAULT 10;
ALTER TABLE website_login_contexts ADD COLUMN today_count INTEGER DEFAULT 0;
ALTER TABLE website_login_contexts ADD COLUMN last_reset_at INTEGER DEFAULT 0;
