-- Add prompt_points and completion_points to usage_logs
ALTER TABLE usage_logs ADD COLUMN prompt_points BIGINT NOT NULL DEFAULT 0;
ALTER TABLE usage_logs ADD COLUMN completion_points BIGINT NOT NULL DEFAULT 0;
