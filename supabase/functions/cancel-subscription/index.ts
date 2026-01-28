import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CancelSubscriptionRequest {
  userId: string;
  reason?: string;
}

interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  subscriptionEndDate?: string;
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
    const { userId, reason }: CancelSubscriptionRequest = await req.json();

    // Validate input
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: userId" }),
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

    // Fetch current subscription details
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select(
        "subscription_tier, subscription_status, subscription_end_date, payment_provider, payment_id"
      )
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has an active subscription
    if (profile.subscription_tier !== "premium") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No active premium subscription to cancel",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (profile.subscription_status === "canceled") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Subscription is already canceled",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Optional: Call Naver Pay API to cancel recurring payment
    // This depends on whether the subscription is set up as recurring
    // For one-time monthly payments, this step may not be necessary
    if (profile.payment_provider === "naverpay" && profile.payment_id) {
      try {
        // Naver Pay cancel API endpoint
        // Documentation: https://developer.pay.naver.com/docs/v2/api#cancel
        const naverPayCancelUrl = `https://dev.apis.naver.com/naverpay-partner/naverpay/payments/v2.2/cancel`;

        const cancelRequest = {
          paymentId: profile.payment_id,
          cancelAmount: 0, // For subscription cancellation (no refund)
          cancelReason: reason || "User requested cancellation",
          // Additional required fields
        };

        const naverPayResponse = await fetch(naverPayCancelUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Naver-Client-Id": Deno.env.get("NAVER_PAY_CLIENT_ID") ?? "",
            "X-Naver-Client-Secret":
              Deno.env.get("NAVER_PAY_CLIENT_SECRET") ?? "",
          },
          body: JSON.stringify(cancelRequest),
        });

        if (!naverPayResponse.ok) {
          const errorData = await naverPayResponse.text();
          console.error("Naver Pay cancel API error:", errorData);
          // Continue with local cancellation even if Naver Pay API fails
        } else {
          console.log("Successfully canceled with Naver Pay");
        }
      } catch (error) {
        console.error("Error calling Naver Pay cancel API:", error);
        // Continue with local cancellation
      }
    }

    // Update subscription status to 'canceled'
    // Keep subscription_end_date so user can continue using until the end of billing period
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        subscription_status: "canceled",
        // Note: We keep subscription_tier as 'premium' and subscription_end_date unchanged
        // This allows the user to continue using premium features until the end of the current billing period
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to cancel subscription",
          details: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log cancellation reason if provided
    if (reason) {
      console.log(`Subscription canceled for user ${userId}. Reason: ${reason}`);
    }

    const response: CancelSubscriptionResponse = {
      success: true,
      message:
        "Subscription canceled successfully. You will retain premium access until the end of your current billing period.",
    };

    if (profile.subscription_end_date) {
      response.subscriptionEndDate = profile.subscription_end_date;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Subscription cancellation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
