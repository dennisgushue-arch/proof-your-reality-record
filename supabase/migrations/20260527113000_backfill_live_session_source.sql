-- Backfill strict provenance marker for legacy live-session incidents.
-- This updates only incidents that:
--   1) still carry the historical `live-session` tag, and
--   2) do not already have a non-empty ai_analysis._source value.

UPDATE public.incidents AS i
SET
  ai_analysis = jsonb_set(
    CASE
      WHEN jsonb_typeof(i.ai_analysis) = 'object' THEN i.ai_analysis
      ELSE '{}'::jsonb
    END,
    '{_source}',
    to_jsonb('live-session'::text),
    true
  ),
  updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements_text(COALESCE(i.tags, '[]'::jsonb)) AS tag(value)
  WHERE lower(tag.value) = 'live-session'
)
AND (
  i.ai_analysis IS NULL
  OR jsonb_typeof(i.ai_analysis) <> 'object'
  OR NULLIF(btrim(i.ai_analysis->>'_source'), '') IS NULL
);
