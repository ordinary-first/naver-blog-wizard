import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the database connection string from Supabase environment
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')
    if (!dbUrl) {
      throw new Error('SUPABASE_DB_URL environment variable not found')
    }

    // Migration SQL - matches 001_add_subscription_columns.sql
    const migrationSQL = `
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
    `

    // Connect to PostgreSQL database
    const client = new Client(dbUrl)
    await client.connect()

    try {
      // Execute the migration
      const result = await client.queryArray(migrationSQL)

      await client.end()

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Migration 001_add_subscription_columns executed successfully',
          result: {
            rowCount: result.rowCount,
            command: result.command
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } catch (dbError) {
      await client.end()
      throw dbError
    }

  } catch (error) {
    console.error('Migration error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
