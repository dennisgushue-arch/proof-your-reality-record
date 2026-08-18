import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import Stripe from "npm:stripe@15.12.0";
import { corsHeaders } from "../_shared/cors.ts";

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

type SubscriptionRow = {
  provider: "stripe" | "google_play";
  stripe_subscription_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

function jsonError(status: number, error: string) {
  return new Response(
    JSON.stringify({ error }),
    {
      status,
      headers: jsonHeaders,
    },
  );
}

function hasFutureAccess(value: string | null) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

async function listAllEvidenceFiles(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string[]> {
  const bucket = admin.storage.from("evidence");
  const paths: string[] = [];

  async function walk(prefix: string): Promise<void> {
    let offset = 0;

    while (true) {
      const { data, error } = await bucket.list(prefix, {
        limit: 100,
        offset,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

      if (error) throw error;

      const entries = data ?? [];

      for (const entry of entries) {
        const fullPath = prefix
          ? `${prefix}/${entry.name}`
          : entry.name;

        // Supabase returns folders without a file id.
        if (entry.id) {
          paths.push(fullPath);
        } else {
          await walk(fullPath);
        }
      }

      if (entries.length < 100) break;
      offset += entries.length;
    }
  }

  await walk(userId);

  return paths;
}

async function removeEvidenceFiles(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  const storagePaths = await listAllEvidenceFiles(
    admin,
    userId,
  );

  for (
    let index = 0;
    index < storagePaths.length;
    index += 100
  ) {
    const { error } = await admin.storage
      .from("evidence")
      .remove(storagePaths.slice(index, index + 100));

    if (error) throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed");
  }

  try {
    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {
      return jsonError(401, "Unauthorized");
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ?? "";

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Account deletion is not configured.",
      );
    }

    // Authenticate the requesting user.
    // Never accept a user id from the browser.
    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonError(401, "Unauthorized");
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // -------------------------------------------------
    // 1. Resolve billing BEFORE deleting any user data.
    // -------------------------------------------------
    const {
      data: subscriptionData,
      error: subscriptionError,
    } = await admin
      .from("subscriptions")
      .select(
        "provider,stripe_subscription_id,status,current_period_end,cancel_at_period_end",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      throw subscriptionError;
    }

    const subscription =
      subscriptionData as SubscriptionRow | null;

    // Google Play billing cannot currently be canceled
    // by this server implementation.
    //
    // Do not delete an account while auto-renew is
    // still enabled or the customer may continue being
    // charged without having an account.
    if (
      subscription?.provider === "google_play" &&
      subscription.cancel_at_period_end !== true &&
      (
        subscription.status === "active" ||
        subscription.status === "trialing" ||
        hasFutureAccess(
          subscription.current_period_end,
        )
      )
    ) {
      return jsonError(
        409,
        "Cancel your Google Play subscription first, then return here to delete your Proof account.",
      );
    }

    // Stripe subscriptions can be canceled server-side.
    if (
      subscription?.provider === "stripe" &&
      subscription.stripe_subscription_id
    ) {
      const stripeSecretKey =
        Deno.env.get("STRIPE_SECRET_KEY") ?? "";

      if (!stripeSecretKey) {
        throw new Error(
          "Stripe account deletion cleanup is not configured.",
        );
      }

      const stripe = new Stripe(
        stripeSecretKey,
        {
          apiVersion: "2024-06-20",
        },
      );

      const remoteSubscription =
        await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id,
        );

      if (
        remoteSubscription.status !== "canceled"
      ) {
        await stripe.subscriptions.cancel(
          subscription.stripe_subscription_id,
        );
      }
    }

    // -------------------------------------------------
    // 2. Remove every Storage object below:
    //
    //    <user_id>/...
    //
    // This catches both normal evidence and orphan files
    // that may no longer have an evidence_items row.
    // -------------------------------------------------
    await removeEvidenceFiles(admin, user.id);

    // -------------------------------------------------
    // 3. Delete analytics that otherwise survive because
    // product_events uses ON DELETE SET NULL.
    // -------------------------------------------------
    const {
      error: productEventsError,
    } = await admin
      .from("product_events")
      .delete()
      .eq("user_id", user.id);

    if (productEventsError) {
      throw productEventsError;
    }

    // -------------------------------------------------
    // 4. Delete Auth user LAST.
    //
    // FK CASCADE handles cases, incidents, evidence
    // metadata, reminders, entities, AI audit records,
    // subscription row, profile, rate-limit counters,
    // etc.
    // -------------------------------------------------
    const {
      error: deleteError,
    } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({
        deleted: true,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Account deletion failed.";

    console.error(
      "delete_account_failed",
      { message },
    );

    return jsonError(
      500,
      "Account deletion could not be completed. Contact support before retrying.",
    );
  }
});
