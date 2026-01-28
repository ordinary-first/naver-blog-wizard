import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PortOneWebhook {
  type: string; // "Transaction.Paid", "Transaction.Failed", "Transaction.Cancelled"
  paymentId: string;
  transactionId: string;
  storeId: string;
  channelKey: string;
  orderName: string;
  currency: string;
  amount: {
    total: number;
    paid: number;
  };
  status: string; // "PAID", "FAILED", "CANCELLED"
  paidAt?: string;
  receipt?: {
    url: string;
  };
  method?: {
    type: string; // "CARD", "VIRTUAL_ACCOUNT", "EASY_PAY"
    easyPay?: {
      provider: string; // "KAKAOPAY", "TOSSPAY", "NAVERPAY"
    };
    card?: {
      company: string;
    };
  };
}

/**
 * Verifies payment with PortOne API
 * This is crucial for security - never trust webhook alone
 */
async function verifyPaymentWithPortOne(
  paymentId: string,
  apiSecret: string
): Promise<any> {
  try {
    const response = await fetch(
      `https://api.portone.io/payments/${paymentId}`,
      {
        headers: {
          "Authorization": `PortOne ${apiSecret}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`PortOne API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Payment verification failed:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client (no user auth required for webhooks)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse webhook data
    const webhookData: PortOneWebhook = await req.json();
    console.log("PortOne Webhook received:", webhookData);

    const { paymentId, status, amount, method } = webhookData;

    // CRITICAL: Verify payment with PortOne API (prevent fraud)
    const apiSecret = Deno.env.get("PORTONE_API_SECRET") ?? "";
    const verifiedPayment = await verifyPaymentWithPortOne(paymentId, apiSecret);

    // Check if verification matches webhook data
    if (verifiedPayment.status !== status || verifiedPayment.amount.total !== amount.total) {
      console.error("Payment verification mismatch");
      return new Response(
        JSON.stringify({ error: "Payment verification failed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find the pending transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("payment_id", paymentId)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found:", txError);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine transaction status
    let transactionStatus = "pending";
    let shouldUpdateSubscription = false;

    switch (status) {
      case "PAID":
        transactionStatus = "completed";
        shouldUpdateSubscription = true;
        break;
      case "FAILED":
        transactionStatus = "failed";
        break;
      case "CANCELLED":
        transactionStatus = "cancelled";
        break;
      default:
        transactionStatus = "pending";
    }

    // Determine payment provider from method
    let paymentProvider = "portone";
    if (method?.easyPay?.provider) {
      const providerMap: { [key: string]: string } = {
        "KAKAOPAY": "kakaopay",
        "TOSSPAY": "tosspay",
        "NAVERPAY": "naverpay",
        "PAYCO": "payco",
      };
      paymentProvider = providerMap[method.easyPay.provider] || "portone";
    } else if (method?.card) {
      paymentProvider = "card";
    }

    // Update transaction status
    const { error: updateTxError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: transactionStatus,
        payment_provider: paymentProvider,
        metadata: {
          ...transaction.metadata,
          webhookData,
          verifiedPayment,
          paymentMethod: method,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateTxError) {
      console.error("Failed to update transaction:", updateTxError);
      return new Response(
        JSON.stringify({ error: "Failed to update transaction" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update user subscription if payment successful
    if (shouldUpdateSubscription) {
      const subscriptionStartDate = new Date();
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_tier: "premium",
          subscription_status: "active",
          subscription_start_date: subscriptionStartDate.toISOString(),
          subscription_end_date: subscriptionEndDate.toISOString(),
          payment_provider: paymentProvider,
          payment_id: paymentId,
          last_payment_date: new Date().toISOString(),
        })
        .eq("id", transaction.user_id);

      if (updateProfileError) {
        console.error("Failed to update profile:", updateProfileError);
        return new Response(
          JSON.stringify({ error: "Failed to update subscription" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(
        `Subscription activated for user ${transaction.user_id} until ${subscriptionEndDate.toISOString()} via ${paymentProvider}`
      );
    }

    // Return 200 OK to acknowledge webhook
    return new Response(
      JSON.stringify({
        success: true,
        transactionStatus,
        paymentProvider,
        message: "Webhook processed successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
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
