-- Migration: Create payment_transactions table
-- Version: 002
-- Description: Creates the payment_transactions table for tracking PortOne payment activities
-- Includes foreign key constraint to auth.users, indexes, and RLS policies

BEGIN;

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_provider TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'KRW',
  status TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
  ON public.payment_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id
  ON public.payment_transactions(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON public.payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at
  ON public.payment_transactions(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status
  ON public.payment_transactions(user_id, status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role (webhooks) can update transaction status
CREATE POLICY "Service role can update transactions"
  ON public.payment_transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMIT;
