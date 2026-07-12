const FALLBACK_SUPABASE_URL = "https://ltyhrjiqrslpgblbzbfg.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aATnmddCtEU8KpdfrgidtA_YSOjWJ07";

const PLACEHOLDER_TOKEN_PATTERN = /(your-project-ref|your-supabase|your-project-id|your-.*key|placeholder|changeme|replace[_-]?me|<.+>)/i;

const isPlaceholderLike = (value: string) => {
  const normalized = value.trim();
  return !normalized || PLACEHOLDER_TOKEN_PATTERN.test(normalized);
};

const isValidSupabaseUrl = (value: string | undefined) => {
  if (!value) return false;

  if (isPlaceholderLike(value)) return false;

  try {
    const parsed = new URL(value);
    if (isPlaceholderLike(parsed.hostname)) return false;
    return /(^|\.)supabase\.co$/i.test(parsed.hostname);
  } catch {
    return false;
  }
};

const isValidPublishableKey = (value: string | undefined) => {
  if (!value) return false;

  const candidate = value.trim();
  if (isPlaceholderLike(candidate)) return false;

  return /^sb_publishable_[A-Za-z0-9_-]+$/.test(candidate);
};

export const resolveSupabaseConfig = (
  envUrl: string | undefined,
  envPublishableKey: string | undefined,
) => {
  const url = isValidSupabaseUrl(envUrl) ? envUrl : FALLBACK_SUPABASE_URL;
  const publishableKey = isValidPublishableKey(envPublishableKey)
    ? envPublishableKey!.trim()
    : FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return {
    url,
    publishableKey,
    usedFallbackUrl: url !== envUrl,
    usedFallbackPublishableKey: publishableKey !== envPublishableKey,
  };
};
