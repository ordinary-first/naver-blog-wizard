-- Fix chat_messages table schema
-- Add missing 'type' and 'timestamp' columns that are required by the app

ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS timestamp TEXT;

-- Update existing messages to have default type
UPDATE chat_messages
SET type = 'text'
WHERE type IS NULL;

-- Also fix any sessions that incorrectly have published_at set
UPDATE chat_sessions
SET published_at = NULL
WHERE status = 'active';
