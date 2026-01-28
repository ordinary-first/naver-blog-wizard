import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CheckSubscriptionRequest {
  userId: string;
}

interface SubscriptionResponse {
  isValid: boolean;
  tier: "free" | "premium";
  status: "active" | "canceled" | "expired";
  blogCount: number;
  limit: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  daysRemaining?: number;
}

const FREE_TIER_LIMIT = 30;
const PREMIUM_TIER_LIMIT = 999999; // Effectively unlimited

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
    const { userId }: CheckSubscriptionRequest = await req.json();

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

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select(
        "subscription_tier, subscription_status, subscription_start_date, subscription_end_date, blog_generation_count"
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

    const now = new Date();
    let isValid = false;
    let tier = profile.subscription_tier || "free";
    let status = profile.subscription_status || "active";
    const blogCount = profile.blog_generation_count || 0;
    let limit = FREE_TIER_LIMIT;
    let daysRemaining: number | undefined;

    // Check if subscription is premium and valid
    if (tier === "premium") {
      limit = PREMIUM_TIER_LIMIT;

      // Check if subscription has expired
      if (profile.subscription_end_date) {
        const endDate = new Date(profile.subscription_end_date);
        if (now > endDate) {
          // Subscription has expired - update status
          status = "expired";
          tier = "free";
          limit = FREE_TIER_LIMIT;
          isValid = blogCount < FREE_TIER_LIMIT;

          // Update profile to reflect expired status
          await supabaseClient
            .from("profiles")
            .update({
              subscription_tier: "free",
              subscription_status: "expired",
            })
            .eq("id", userId);
        } else {
          // Subscription is active
          isValid = status === "active";
          daysRemaining = Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
      } else {
        // No end date set - treat as invalid
        status = "expired";
        tier = "free";
        limit = FREE_TIER_LIMIT;
        isValid = blogCount < FREE_TIER_LIMIT;
      }
    } else {
      // Free tier - check if user has exceeded limit
      isValid = blogCount < FREE_TIER_LIMIT;
    }

    const response: SubscriptionResponse = {
      isValid,
      tier: tier as "free" | "premium",
      status: status as "active" | "canceled" | "expired",
      blogCount,
      limit,
    };

    // Add optional fields for premium users
    if (profile.subscription_start_date) {
      response.subscriptionStartDate = profile.subscription_start_date;
    }
    if (profile.subscription_end_date) {
      response.subscriptionEndDate = profile.subscription_end_date;
    }
    if (daysRemaining !== undefined) {
      response.daysRemaining = daysRemaining;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Subscription check error:", error);
    return new Response(
      JSON.stringify({
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
