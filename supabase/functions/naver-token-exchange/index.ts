// Supabase Edge Function: naver-token-exchange
//
// Receives an OAuth authorization code from the mobile app,
// exchanges it for an access token server-side (keeping client_secret safe),
// fetches the Naver user profile, and returns both to the client.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me";

interface TokenExchangeRequest {
  code: string;
  state: string;
  redirectUri: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { code, state, redirectUri }: TokenExchangeRequest = await req.json();

    if (!code || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: code, redirectUri" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Read secrets from environment (set via Supabase dashboard or CLI)
    const clientId = Deno.env.get("NAVER_CLIENT_ID");
    const clientSecret = Deno.env.get("NAVER_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("NAVER_CLIENT_ID or NAVER_CLIENT_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      state: state || "",
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(
      `${NAVER_TOKEN_URL}?${tokenParams.toString()}`,
      { method: "POST" }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Naver token exchange error:", tokenData);
      return new Response(
        JSON.stringify({
          error: "Token exchange failed",
          details: tokenData.error_description || tokenData.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessToken: string = tokenData.access_token;
    const refreshToken: string = tokenData.refresh_token;

    // Step 2: Fetch user profile from Naver
    const profileResponse = await fetch(NAVER_PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profileData = await profileResponse.json();

    if (profileData.resultcode !== "00") {
      console.error("Naver profile fetch error:", profileData);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch user profile",
          details: profileData.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const naverUser = profileData.response;

    // Step 3: Return the token and user data to the mobile app
    const responseBody = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      user: {
        id: naverUser.id,
        email: naverUser.email || undefined,
        name: naverUser.nickname || naverUser.name || undefined,
        profileImage: naverUser.profile_image || undefined,
      },
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("naver-token-exchange error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
