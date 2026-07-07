const FALLBACK_SUPABASE_URL = "https://ltyhrjiqrslpgblbzbfg.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aATnmddCtEU8KpdfrgidtA_YSOjWJ07";

const isValidSupabaseUrl = (value: string | undefined) => {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return /(^|\.)supabase\.co$/i.test(parsed.hostname);
  } catch {
    return false;
  }
};

export const resolveSupabaseConfig = (
  envUrl: string | undefined,
  envPublishableKey: string | undefined,
) => {
  const url = isValidSupabaseUrl(envUrl) ? envUrl : FALLBACK_SUPABASE_URL;
  const publishableKey = envPublishableKey?.trim() ? envPublishableKey : FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return {
    url,
    publishableKey,
    usedFallbackUrl: url !== envUrl,
    usedFallbackPublishableKey: publishableKey !== envPublishableKey,
  };
};
