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

    // Migration SQL - create payment_transactions table
    const migrationSQL = `
BEGIN;

-- Create payment_transactions table if not exists
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
  ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id
  ON public.payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at
  ON public.payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status
  ON public.payment_transactions(user_id, status);

-- Enable RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop first if exist to avoid errors)
DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.payment_transactions;
CREATE POLICY "Authenticated users can create transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can update transactions" ON public.payment_transactions;
CREATE POLICY "Service role can update transactions"
  ON public.payment_transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

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
          message: 'Migration 002_create_payment_transactions executed successfully',
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
