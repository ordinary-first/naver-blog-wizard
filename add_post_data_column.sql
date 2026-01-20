-- Add post_data column to chat_sessions table to store blog post content
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS post_data JSONB DEFAULT '{}'::jsonb;
