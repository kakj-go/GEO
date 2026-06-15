-- Add platform column to aieo_generates table
ALTER TABLE aieo_generates ADD COLUMN platform VARCHAR(50) NOT NULL DEFAULT '';
