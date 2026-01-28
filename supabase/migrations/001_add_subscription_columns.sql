-- Migration: Add subscription columns to profiles table
-- Version: 001
-- Description: Adds subscription tier, status, and payment tracking columns to the profiles table
-- This migration handles existing data gracefully with default values

BEGIN;

-- Add subscription columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blog_generation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_provider TEXT,
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;

-- Add check constraints for valid values
ALTER TABLE public.profiles
ADD CONSTRAINT check_subscription_tier
  CHECK (subscription_tier IN ('free', 'premium')) NOT VALID;

ALTER TABLE public.profiles
ADD CONSTRAINT check_subscription_status
  CHECK (subscription_status IN ('active', 'canceled', 'expired')) NOT VALID;

-- Validate constraints (allows existing rows that don't match)
-- This prevents errors on migrations against existing databases
ALTER TABLE public.profiles VALIDATE CONSTRAINT check_subscription_tier;
ALTER TABLE public.profiles VALIDATE CONSTRAINT check_subscription_status;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier
  ON public.profiles(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
  ON public.profiles(subscription_status);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_start_date
  ON public.profiles(subscription_start_date);

CREATE INDEX IF NOT EXISTS idx_profiles_payment_provider
  ON public.profiles(payment_provider);

COMMIT;
