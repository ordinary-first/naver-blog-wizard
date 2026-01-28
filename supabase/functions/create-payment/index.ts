import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  userId: string;
  amount: number;
  planType: "premium";
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { userId, amount, planType }: PaymentRequest = await req.json();

    // Validate input
    if (!userId || !amount || !planType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, amount, planType" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: "User ID mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate amount (should be 2000 KRW for premium)
    if (planType === "premium" && amount !== 2000) {
      return new Response(
        JSON.stringify({ error: "Invalid amount for premium plan" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user profile for customer info
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("username, naver_id")
      .eq("id", userId)
      .single();

    // Generate unique payment ID (PortOne uses this as merchant payment ID)
    const paymentId = `payment_${Date.now()}_${userId.slice(0, 8)}`;
    const orderId = `order_${Date.now()}`;

    // Store pending transaction in database
    const { error: insertError } = await supabaseClient
      .from("payment_transactions")
      .insert({
        user_id: userId,
        payment_provider: "portone", // Changed from naverpay
        payment_id: paymentId,
        amount: amount,
        currency: "KRW",
        status: "pending",
        transaction_type: "subscription",
        metadata: {
          orderId,
          planType,
          customerName: profile?.username || profile?.naver_id || "Unknown",
          storeId: Deno.env.get("PORTONE_STORE_ID"),
        },
      });

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to store transaction",
          details: insertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return payment information for PortOne SDK
    // The actual payment will be initiated on the client side using PortOne SDK
    return new Response(
      JSON.stringify({
        success: true,
        paymentId,
        orderId,
        storeId: Deno.env.get("PORTONE_STORE_ID"),
        amount,
        currency: "KRW",
        orderName: "네이버 블로그 위저드 프리미엄 (1개월)",
        customerName: profile?.username || profile?.naver_id || "Unknown",
        customerEmail: user.email || "",
        // PortOne will handle the actual payment on client-side
        // Webhook will confirm the payment after completion
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
