type SubscriptionClient = {
  from: (table: string) => any;
};

export type PaidAccessResult = {
  allowed: boolean;
  error?: string;
};

export async function checkPaidAccess(
  client: SubscriptionClient,
  userId: string,
): Promise<PaidAccessResult> {
  const { data, error } = await client
    .from("subscriptions")
    .select("plan,status,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      allowed: false,
      error: error.message,
    };
  }

  if (!data) return { allowed: false };

  if (data.plan !== "pro" && data.plan !== "premium") {
    return { allowed: false };
  }

  if (data.current_period_end) {
    const end = new Date(data.current_period_end).getTime();

    return {
      allowed: Number.isFinite(end) && end > Date.now(),
    };
  }

  return {
    allowed: data.status === "active" || data.status === "trialing",
  };
}
