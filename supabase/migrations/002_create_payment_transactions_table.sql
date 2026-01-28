-- Migration: Create payment_transactions table
-- Version: 002
-- Description: Creates the payment_transactions table for tracking all payment activities
-- Includes foreign key constraint to auth.users, indexes, and check constraints

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_payment_status
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  CONSTRAINT check_transaction_type
    CHECK (transaction_type IN ('subscription', 'one_time')),
  CONSTRAINT check_payment_provider
    CHECK (payment_provider IN ('naverpay', 'toss', 'kakao')),
  CONSTRAINT check_amount_positive
    CHECK (amount > 0)
);

-- Create indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
  ON public.payment_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id
  ON public.payment_transactions(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON public.payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_provider
  ON public.payment_transactions(payment_provider);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at
  ON public.payment_transactions(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status
  ON public.payment_transactions(user_id, status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure access
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can insert transactions
CREATE POLICY "Authenticated users can create transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users cannot update their transactions (immutable record)
-- Admins/functions can update via service role

COMMIT;
