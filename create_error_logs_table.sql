-- Error logs table for debugging iOS issues
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    error_type TEXT NOT NULL,
    error_message TEXT,
    error_details JSONB,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert own error logs"
ON error_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow reading all logs (for debugging)
CREATE POLICY "Anyone can read error logs"
ON error_logs FOR SELECT
TO authenticated
USING (true);
