-- Entity Intelligence Checkpoint 2: atomic incident entity extraction persistence.
--
-- JSON input contract for p_entities:
-- [
--   {
--     "type": "person",
--     "canonicalName": "John Smith",
--     "normalizedName": "john smith",
--     "aliases": ["John"],
--     "matchedText": "John",
--     "sourceField": "description",
--     "contextExcerpt": "John arrived at the school...",
--     "confidence": "high",
--     "occurredAt": "2026-07-22T10:00:00Z",
--     "evidenceItemId": null,
--     "metadata": {}
--   }
-- ]
--
-- JSON input contract for p_relationships:
-- [
--   {
--     "sourceType": "person",
--     "sourceNormalizedName": "john smith",
--     "targetType": "school",
--     "targetNormalizedName": "lincoln elementary",
--     "relationshipType": "mentioned_with",
--     "confidence": "medium",
--     "occurredAt": "2026-07-22T10:00:00Z"
--   }
-- ]

CREATE OR REPLACE FUNCTION public.replace_incident_entity_extraction(
  p_case_id UUID,
  p_incident_id UUID,
  p_entities JSONB,
  p_relationships JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_incident_occurred_at TIMESTAMPTZ;
  v_entity_count INTEGER := 0;
  v_mention_count INTEGER := 0;
  v_relationship_count INTEGER := 0;
  v_deleted_orphan_count INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF jsonb_typeof(COALESCE(p_entities, 'null'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'p_entities must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(COALESCE(p_relationships, 'null'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'p_relationships must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cases c WHERE c.id = p_case_id AND c.user_id = v_user_id) THEN
    RAISE EXCEPTION 'Case not found or not owned by authenticated user' USING ERRCODE = '42501';
  END IF;

  SELECT i.occurred_at INTO v_incident_occurred_at
  FROM public.incidents i
  WHERE i.id = p_incident_id
    AND i.case_id = p_case_id
    AND i.user_id = v_user_id;

  IF v_incident_occurred_at IS NULL THEN
    RAISE EXCEPTION 'Incident not found for case or not owned by authenticated user' USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.entity_extraction_entities (
    row_no INTEGER,
    entity_type TEXT,
    canonical_name TEXT,
    normalized_name TEXT,
    aliases TEXT[],
    matched_text TEXT,
    source_field TEXT,
    context_excerpt TEXT,
    confidence TEXT,
    occurred_at TIMESTAMPTZ,
    evidence_item_id UUID,
    metadata JSONB
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.entity_extraction_entities;

  INSERT INTO pg_temp.entity_extraction_entities (
    row_no,
    entity_type,
    canonical_name,
    normalized_name,
    aliases,
    matched_text,
    source_field,
    context_excerpt,
    confidence,
    occurred_at,
    evidence_item_id,
    metadata
  )
  SELECT
    item.ordinality::INTEGER,
    item.value->>'type',
    NULLIF(BTRIM(item.value->>'canonicalName'), ''),
    NULLIF(BTRIM(item.value->>'normalizedName'), ''),
    COALESCE((
      SELECT ARRAY_AGG(DISTINCT BTRIM(alias_value))
      FROM jsonb_array_elements_text(COALESCE(item.value->'aliases', '[]'::jsonb)) AS alias_value
      WHERE BTRIM(alias_value) <> ''
    ), ARRAY[]::TEXT[]),
    NULLIF(BTRIM(item.value->>'matchedText'), ''),
    NULLIF(BTRIM(item.value->>'sourceField'), ''),
    NULLIF(BTRIM(item.value->>'contextExcerpt'), ''),
    NULLIF(LOWER(BTRIM(item.value->>'confidence')), ''),
    COALESCE(NULLIF(item.value->>'occurredAt', '')::TIMESTAMPTZ, v_incident_occurred_at),
    NULLIF(item.value->>'evidenceItemId', '')::UUID,
    CASE WHEN jsonb_typeof(COALESCE(item.value->'metadata', '{}'::jsonb)) = 'object'
      THEN COALESCE(item.value->'metadata', '{}'::jsonb)
      ELSE '{}'::jsonb
    END
  FROM jsonb_array_elements(p_entities) WITH ORDINALITY AS item(value, ordinality);

  IF EXISTS (
    SELECT 1
    FROM pg_temp.entity_extraction_entities e
    WHERE e.entity_type IS NULL
      OR e.entity_type NOT IN ('person', 'location', 'organization', 'school', 'address', 'phone', 'email', 'url', 'vehicle', 'date', 'court', 'other')
      OR e.canonical_name IS NULL
      OR e.normalized_name IS NULL
      OR e.matched_text IS NULL
      OR e.source_field IS NULL
      OR e.confidence IS NULL
      OR e.confidence NOT IN ('high', 'medium', 'low')
      OR e.occurred_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Malformed entity extraction payload' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.entity_extraction_entities e
    WHERE e.evidence_item_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.evidence_items ev
        JOIN public.incidents i ON i.id = ev.incident_id
        WHERE ev.id = e.evidence_item_id
          AND ev.user_id = v_user_id
          AND ev.incident_id = p_incident_id
          AND i.case_id = p_case_id
          AND i.user_id = v_user_id
      )
  ) THEN
    RAISE EXCEPTION 'Evidence item does not belong to incident/case/user' USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.entity_extraction_old_entities (entity_id UUID PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE pg_temp.entity_extraction_old_entities;

  INSERT INTO pg_temp.entity_extraction_old_entities(entity_id)
  SELECT DISTINCT em.entity_id
  FROM public.entity_mentions em
  WHERE em.case_id = p_case_id
    AND em.incident_id = p_incident_id
    AND em.user_id = v_user_id;

  DELETE FROM public.entity_mentions em
  WHERE em.case_id = p_case_id
    AND em.incident_id = p_incident_id
    AND em.user_id = v_user_id;

  INSERT INTO public.case_entities (
    user_id,
    case_id,
    entity_type,
    canonical_name,
    normalized_name,
    aliases,
    metadata
  )
  SELECT DISTINCT ON (entity_type, normalized_name)
    v_user_id,
    p_case_id,
    entity_type,
    canonical_name,
    normalized_name,
    aliases,
    metadata
  FROM pg_temp.entity_extraction_entities
  ORDER BY entity_type, normalized_name, row_no
  ON CONFLICT (case_id, entity_type, normalized_name) DO UPDATE SET
    canonical_name = COALESCE(NULLIF(public.case_entities.canonical_name, ''), EXCLUDED.canonical_name),
    aliases = ARRAY(
      SELECT DISTINCT alias_value
      FROM unnest(public.case_entities.aliases || EXCLUDED.aliases || ARRAY[EXCLUDED.canonical_name]) AS alias_value
      WHERE BTRIM(alias_value) <> ''
      ORDER BY alias_value
    ),
    metadata = public.case_entities.metadata || EXCLUDED.metadata,
    updated_at = now();

  INSERT INTO public.entity_mentions (
    user_id,
    case_id,
    entity_id,
    incident_id,
    evidence_item_id,
    source_field,
    matched_text,
    context_excerpt,
    confidence,
    occurred_at
  )
  SELECT DISTINCT ON (ce.id, e.matched_text)
    v_user_id,
    p_case_id,
    ce.id,
    p_incident_id,
    e.evidence_item_id,
    e.source_field,
    e.matched_text,
    e.context_excerpt,
    e.confidence,
    e.occurred_at
  FROM pg_temp.entity_extraction_entities e
  JOIN public.case_entities ce
    ON ce.case_id = p_case_id
   AND ce.user_id = v_user_id
   AND ce.entity_type = e.entity_type
   AND ce.normalized_name = e.normalized_name
  ORDER BY ce.id, e.matched_text, e.row_no
  ON CONFLICT (entity_id, incident_id, matched_text) DO UPDATE SET
    evidence_item_id = EXCLUDED.evidence_item_id,
    source_field = EXCLUDED.source_field,
    context_excerpt = EXCLUDED.context_excerpt,
    confidence = EXCLUDED.confidence,
    occurred_at = EXCLUDED.occurred_at;

  GET DIAGNOSTICS v_mention_count = ROW_COUNT;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.entity_extraction_relationships (
    row_no INTEGER,
    source_type TEXT,
    source_normalized_name TEXT,
    target_type TEXT,
    target_normalized_name TEXT,
    relationship_type TEXT,
    confidence TEXT,
    occurred_at TIMESTAMPTZ
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.entity_extraction_relationships;

  INSERT INTO pg_temp.entity_extraction_relationships (
    row_no,
    source_type,
    source_normalized_name,
    target_type,
    target_normalized_name,
    relationship_type,
    confidence,
    occurred_at
  )
  SELECT
    item.ordinality::INTEGER,
    item.value->>'sourceType',
    NULLIF(BTRIM(item.value->>'sourceNormalizedName'), ''),
    item.value->>'targetType',
    NULLIF(BTRIM(item.value->>'targetNormalizedName'), ''),
    NULLIF(BTRIM(item.value->>'relationshipType'), ''),
    NULLIF(LOWER(BTRIM(item.value->>'confidence')), ''),
    COALESCE(NULLIF(item.value->>'occurredAt', '')::TIMESTAMPTZ, v_incident_occurred_at)
  FROM jsonb_array_elements(p_relationships) WITH ORDINALITY AS item(value, ordinality);

  IF EXISTS (
    SELECT 1
    FROM pg_temp.entity_extraction_relationships r
    WHERE r.source_type IS NULL
      OR r.source_type NOT IN ('person', 'location', 'organization', 'school', 'address', 'phone', 'email', 'url', 'vehicle', 'date', 'court', 'other')
      OR r.target_type IS NULL
      OR r.target_type NOT IN ('person', 'location', 'organization', 'school', 'address', 'phone', 'email', 'url', 'vehicle', 'date', 'court', 'other')
      OR r.source_normalized_name IS NULL
      OR r.target_normalized_name IS NULL
      OR r.relationship_type IS NULL
      OR r.confidence IS NULL
      OR r.confidence NOT IN ('high', 'medium', 'low')
      OR r.occurred_at IS NULL
      OR (r.source_type = r.target_type AND r.source_normalized_name = r.target_normalized_name)
  ) THEN
    RAISE EXCEPTION 'Malformed relationship extraction payload' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.entity_extraction_relationships r
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.case_entities source_entity
      WHERE source_entity.case_id = p_case_id
        AND source_entity.user_id = v_user_id
        AND source_entity.entity_type = r.source_type
        AND source_entity.normalized_name = r.source_normalized_name
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.case_entities target_entity
      WHERE target_entity.case_id = p_case_id
        AND target_entity.user_id = v_user_id
        AND target_entity.entity_type = r.target_type
        AND target_entity.normalized_name = r.target_normalized_name
    )
  ) THEN
    RAISE EXCEPTION 'Relationship endpoint does not reference an existing same-case entity' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.entity_relationships (
    user_id,
    case_id,
    source_entity_id,
    target_entity_id,
    relationship_type,
    mention_count,
    confidence,
    first_seen_at,
    last_seen_at
  )
  SELECT DISTINCT ON (source_entity.id, target_entity.id, r.relationship_type)
    v_user_id,
    p_case_id,
    source_entity.id,
    target_entity.id,
    r.relationship_type,
    1,
    r.confidence,
    r.occurred_at,
    r.occurred_at
  FROM pg_temp.entity_extraction_relationships r
  JOIN public.case_entities source_entity
    ON source_entity.case_id = p_case_id
   AND source_entity.user_id = v_user_id
   AND source_entity.entity_type = r.source_type
   AND source_entity.normalized_name = r.source_normalized_name
  JOIN public.case_entities target_entity
    ON target_entity.case_id = p_case_id
   AND target_entity.user_id = v_user_id
   AND target_entity.entity_type = r.target_type
   AND target_entity.normalized_name = r.target_normalized_name
  WHERE source_entity.id <> target_entity.id
  ORDER BY source_entity.id, target_entity.id, r.relationship_type, r.row_no
  ON CONFLICT (case_id, source_entity_id, target_entity_id, relationship_type) DO UPDATE SET
    confidence = COALESCE(EXCLUDED.confidence, public.entity_relationships.confidence),
    first_seen_at = LEAST(COALESCE(public.entity_relationships.first_seen_at, EXCLUDED.first_seen_at), EXCLUDED.first_seen_at),
    last_seen_at = GREATEST(COALESCE(public.entity_relationships.last_seen_at, EXCLUDED.last_seen_at), EXCLUDED.last_seen_at),
    updated_at = now();

  GET DIAGNOSTICS v_relationship_count = ROW_COUNT;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.entity_extraction_affected_entities (entity_id UUID PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE pg_temp.entity_extraction_affected_entities;

  INSERT INTO pg_temp.entity_extraction_affected_entities(entity_id)
  SELECT entity_id FROM pg_temp.entity_extraction_old_entities
  ON CONFLICT DO NOTHING;

  INSERT INTO pg_temp.entity_extraction_affected_entities(entity_id)
  SELECT DISTINCT ce.id
  FROM pg_temp.entity_extraction_entities e
  JOIN public.case_entities ce
    ON ce.case_id = p_case_id
   AND ce.user_id = v_user_id
   AND ce.entity_type = e.entity_type
   AND ce.normalized_name = e.normalized_name
  ON CONFLICT DO NOTHING;

  INSERT INTO pg_temp.entity_extraction_affected_entities(entity_id)
  SELECT DISTINCT source_entity_id FROM public.entity_relationships WHERE case_id = p_case_id AND user_id = v_user_id
  ON CONFLICT DO NOTHING;

  INSERT INTO pg_temp.entity_extraction_affected_entities(entity_id)
  SELECT DISTINCT target_entity_id FROM public.entity_relationships WHERE case_id = p_case_id AND user_id = v_user_id
  ON CONFLICT DO NOTHING;

  UPDATE public.case_entities ce
  SET
    mention_count = stats.mention_count,
    first_seen_at = stats.first_seen_at,
    last_seen_at = stats.last_seen_at,
    updated_at = now()
  FROM (
    SELECT
      affected.entity_id,
      COUNT(em.id)::INTEGER AS mention_count,
      MIN(em.occurred_at) AS first_seen_at,
      MAX(em.occurred_at) AS last_seen_at
    FROM pg_temp.entity_extraction_affected_entities affected
    LEFT JOIN public.entity_mentions em
      ON em.entity_id = affected.entity_id
     AND em.case_id = p_case_id
     AND em.user_id = v_user_id
    GROUP BY affected.entity_id
  ) stats
  WHERE ce.id = stats.entity_id
    AND ce.case_id = p_case_id
    AND ce.user_id = v_user_id;

  WITH deleted AS (
    DELETE FROM public.case_entities ce
    WHERE ce.case_id = p_case_id
      AND ce.user_id = v_user_id
      AND ce.id IN (SELECT entity_id FROM pg_temp.entity_extraction_affected_entities)
      AND NOT EXISTS (SELECT 1 FROM public.entity_mentions em WHERE em.entity_id = ce.id)
      AND NOT EXISTS (SELECT 1 FROM public.entity_relationships er WHERE er.source_entity_id = ce.id OR er.target_entity_id = ce.id)
    RETURNING ce.id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_orphan_count FROM deleted;

  SELECT COUNT(DISTINCT ce.id)::INTEGER INTO v_entity_count
  FROM pg_temp.entity_extraction_entities e
  JOIN public.case_entities ce
    ON ce.case_id = p_case_id
   AND ce.user_id = v_user_id
   AND ce.entity_type = e.entity_type
   AND ce.normalized_name = e.normalized_name;

  RETURN jsonb_build_object(
    'entity_count', COALESCE(v_entity_count, 0),
    'mention_count', COALESCE(v_mention_count, 0),
    'relationship_count', COALESCE(v_relationship_count, 0),
    'deleted_orphan_count', COALESCE(v_deleted_orphan_count, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.replace_incident_entity_extraction(UUID, UUID, JSONB, JSONB)
IS 'Atomically replaces one incident entity extraction. p_entities is an array of validated entity mention objects; p_relationships is an array of same-case entity relationship objects. The function uses auth.uid(), preserves RLS with SECURITY INVOKER, deletes existing mentions for the incident, upserts case entities and relationships, recalculates entity mention counts/timestamps, removes orphan entities, and returns entity_count, mention_count, relationship_count, deleted_orphan_count.';
