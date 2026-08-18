type RateLimitClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

type RateLimitRow = {
  allowed?: boolean;
  request_count?: number;
  limit_value?: number;
  reset_at?: string;
};

export type AiRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
  error?: string;
};

const BURST_WINDOW_SECONDS = 10 * 60;
const BURST_LIMIT = 12;

const DAILY_WINDOW_SECONDS = 24 * 60 * 60;
const DAILY_LIMIT = 100;

async function consumeWindow(
  client: RateLimitClient,
  userId: string,
  bucketKey: string,
  windowSeconds: number,
  limit: number,
): Promise<AiRateLimitResult> {
  const { data, error } = await client.rpc("consume_ai_rate_limit", {
    p_user_id: userId,
    p_bucket_key: bucketKey,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });

  if (error) {
    return {
      allowed: false,
      error: error.message ?? "Unable to verify AI usage limit",
    };
  }

  const row = (
    Array.isArray(data)
      ? data[0]
      : data
  ) as RateLimitRow | null;

  if (!row) {
    return {
      allowed: false,
      error: "AI usage limit returned no result",
    };
  }

  if (row.allowed === true) {
    return { allowed: true };
  }

  const resetTime = row.reset_at
    ? new Date(row.reset_at).getTime()
    : Date.now() + 60_000;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((resetTime - Date.now()) / 1000),
  );

  return {
    allowed: false,
    retryAfterSeconds,
  };
}

export async function consumeAiRateLimit(
  client: RateLimitClient,
  userId: string,
): Promise<AiRateLimitResult> {
  const burst = await consumeWindow(
    client,
    userId,
    "ai_all_10_minutes",
    BURST_WINDOW_SECONDS,
    BURST_LIMIT,
  );

  if (!burst.allowed) return burst;

  return await consumeWindow(
    client,
    userId,
    "ai_all_daily",
    DAILY_WINDOW_SECONDS,
    DAILY_LIMIT,
  );
}
