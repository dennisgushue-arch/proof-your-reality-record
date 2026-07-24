import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20260722090000_add_entity_intelligence.sql");
const migration = readFileSync(migrationPath, "utf8");
const rpcMigrationPath = resolve(process.cwd(), "supabase/migrations/20260722103000_add_entity_extraction_rpc.sql");
const rpcMigration = readFileSync(rpcMigrationPath, "utf8");

const entityTypes = [
  "person",
  "location",
  "organization",
  "school",
  "address",
  "phone",
  "email",
  "url",
  "vehicle",
  "date",
  "court",
  "other",
];

describe("Entity Intelligence Checkpoint 1 migration", () => {
  it("creates the required entity tables", () => {
    expect(migration).toContain("CREATE TABLE public.case_entities");
    expect(migration).toContain("CREATE TABLE public.entity_mentions");
    expect(migration).toContain("CREATE TABLE public.entity_relationships");
  });

  it("enforces allowed entity and confidence values", () => {
    for (const entityType of entityTypes) {
      expect(migration).toContain(`'${entityType}'`);
    }
    expect(migration).toContain("case_entities_type_check");
    expect(migration).toContain("entity_mentions_confidence_check");
    expect(migration).toContain("entity_relationships_confidence_check");
  });

  it("adds uniqueness and relationship safety constraints", () => {
    expect(migration).toContain("CONSTRAINT case_entities_id_case_user_unique UNIQUE (id, case_id, user_id)");
    expect(migration).toContain("ADD CONSTRAINT incidents_id_case_user_unique UNIQUE (id, case_id, user_id)");
    expect(migration).toContain("ADD CONSTRAINT evidence_items_id_incident_user_unique UNIQUE (id, incident_id, user_id)");
    expect(migration).toContain("CONSTRAINT case_entities_unique_normalized UNIQUE (case_id, entity_type, normalized_name)");
    expect(migration).toContain("CONSTRAINT entity_mentions_entity_same_case_user_fk FOREIGN KEY (entity_id, case_id, user_id)");
    expect(migration).toContain("REFERENCES public.case_entities(id, case_id, user_id) ON DELETE CASCADE");
    expect(migration).toContain("CONSTRAINT entity_mentions_incident_same_case_user_fk FOREIGN KEY (incident_id, case_id, user_id)");
    expect(migration).toContain("REFERENCES public.incidents(id, case_id, user_id) ON DELETE CASCADE");
    expect(migration).toContain("CONSTRAINT entity_mentions_evidence_same_incident_user_fk FOREIGN KEY (evidence_item_id, incident_id, user_id)");
    expect(migration).toContain("REFERENCES public.evidence_items(id, incident_id, user_id) ON DELETE CASCADE");
    expect(migration).toContain("CONSTRAINT entity_mentions_unique_match UNIQUE (entity_id, incident_id, matched_text)");
    expect(migration).toContain("CONSTRAINT entity_relationships_no_self_check CHECK (source_entity_id <> target_entity_id)");
    expect(migration).toContain("CONSTRAINT entity_relationships_source_same_case_user_fk FOREIGN KEY (source_entity_id, case_id, user_id)");
    expect(migration).toContain("CONSTRAINT entity_relationships_target_same_case_user_fk FOREIGN KEY (target_entity_id, case_id, user_id)");
    expect(migration).toContain("CONSTRAINT entity_relationships_unique_type UNIQUE (case_id, source_entity_id, target_entity_id, relationship_type)");
  });

  it("validates entity mention references through same-case and same-user policy checks", () => {
    expect(migration).toContain("ce.id = entity_id AND ce.case_id = case_id AND ce.user_id = auth.uid()");
    expect(migration).toContain("i.id = incident_id AND i.case_id = case_id AND i.user_id = auth.uid()");
    expect(migration).toContain("evidence_item_id IS NULL");
    expect(migration).toContain("ev.id = evidence_item_id");
    expect(migration).toContain("ev.incident_id = incident_id");
    expect(migration).toContain("ev.user_id = auth.uid()");
    expect(migration).toContain("ei.case_id = case_id");
    expect(migration).toContain("ei.user_id = auth.uid()");
  });

  it("validates entity relationship references through same-case and same-user policy checks", () => {
    expect(migration).toContain("source.id = source_entity_id AND source.case_id = case_id AND source.user_id = auth.uid()");
    expect(migration).toContain("target.id = target_entity_id AND target.case_id = case_id AND target.user_id = auth.uid()");
    expect(migration.match(/source_entity_id <> target_entity_id/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("adds required indexes", () => {
    for (const indexName of [
      "case_entities_case_id_idx",
      "case_entities_user_id_idx",
      "case_entities_entity_type_idx",
      "case_entities_normalized_name_idx",
      "case_entities_mention_count_idx",
      "entity_mentions_entity_id_idx",
      "entity_mentions_incident_id_idx",
      "entity_mentions_case_id_idx",
      "entity_mentions_occurred_at_idx",
      "entity_relationships_case_id_idx",
      "entity_relationships_source_entity_idx",
      "entity_relationships_target_entity_idx",
    ]) {
      expect(migration).toContain(indexName);
    }
  });

  it("enables RLS and verifies user plus related case ownership in policies", () => {
    expect(migration).toContain("ALTER TABLE public.case_entities ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.entity_mentions ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY");
    expect(migration.match(/auth\.uid\(\) = user_id/g)?.length).toBeGreaterThanOrEqual(12);
    expect(migration.match(/c\.user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(12);
  });

  it("keeps Checkpoint 1 migration limited to schema and deterministic extractor artifacts", () => {
    expect(existsSync(resolve(process.cwd(), "src/features/entities/types.ts"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "src/features/entities/extraction/deterministicExtractors.ts"))).toBe(true);

    expect(migration).not.toContain("replace_incident_entity_extraction");
    expect(migration).not.toContain("recalculate_case_entity_counts");
    expect(existsSync(resolve(process.cwd(), "src/features/entities/services/entityService.ts"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "src/features/entities/pages/EntitiesPage.tsx"))).toBe(false);
  });
});

describe("Entity Intelligence Checkpoint 2B extract-entities Edge Function", () => {
  const edgeFunctionPath = resolve(process.cwd(), "supabase/functions/extract-entities/index.ts");
  const edgeHandlerPath = resolve(process.cwd(), "supabase/functions/extract-entities/handler.ts");
  const edgeProviderPath = resolve(process.cwd(), "supabase/functions/extract-entities/provider.ts");

  it("adds the extract-entities Edge Function without adding client/UI service artifacts", () => {
    expect(existsSync(edgeFunctionPath)).toBe(true);
    expect(existsSync(edgeHandlerPath)).toBe(true);
    expect(existsSync(edgeProviderPath)).toBe(true);
    expect(existsSync(resolve(process.cwd(), "src/features/entities/services/entityService.ts"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "src/features/entities/pages/EntitiesPage.tsx"))).toBe(false);
  });

  it("calls the Checkpoint 2A replacement RPC from the Edge Function handler", () => {
    const handler = readFileSync(edgeHandlerPath, "utf8");
    expect(handler).toContain('client.rpc("replace_incident_entity_extraction", args)');
    expect(handler).toContain("p_case_id: body.caseId");
    expect(handler).toContain("p_incident_id: body.incidentId");
    expect(handler).toContain("p_entities: entityPayload");
    expect(handler).toContain("p_relationships: relationshipPayload");
  });
});

describe("Entity Intelligence Checkpoint 2A atomic extraction RPC migration", () => {
  it("creates the atomic replacement RPC as SECURITY INVOKER", () => {
    expect(rpcMigration).toContain("CREATE OR REPLACE FUNCTION public.replace_incident_entity_extraction");
    expect(rpcMigration).toContain("SECURITY INVOKER");
    expect(rpcMigration).not.toContain("SECURITY DEFINER");
    expect(rpcMigration).not.toContain("service_role");
    expect(rpcMigration).toContain("v_user_id UUID := auth.uid()");
  });

  it("requires authentication and never trusts caller-supplied user_id", () => {
    expect(rpcMigration).toContain("IF v_user_id IS NULL THEN");
    expect(rpcMigration).toContain("Authentication required");
    expect(rpcMigration).toContain("v_user_id,");
    expect(rpcMigration).not.toContain("item.value->>'userId'");
    expect(rpcMigration).not.toContain("item.value->>'user_id'");
  });

  it("documents and validates JSON input contracts", () => {
    expect(rpcMigration).toContain("JSON input contract for p_entities");
    expect(rpcMigration).toContain("JSON input contract for p_relationships");
    expect(rpcMigration).toContain("p_entities must be a JSON array");
    expect(rpcMigration).toContain("p_relationships must be a JSON array");
    expect(rpcMigration).toContain("Malformed entity extraction payload");
    expect(rpcMigration).toContain("Malformed relationship extraction payload");
  });

  it("verifies authenticated case and incident ownership", () => {
    expect(rpcMigration).toContain("c.id = p_case_id AND c.user_id = v_user_id");
    expect(rpcMigration).toContain("Case not found or not owned by authenticated user");
    expect(rpcMigration).toContain("i.id = p_incident_id");
    expect(rpcMigration).toContain("i.case_id = p_case_id");
    expect(rpcMigration).toContain("i.user_id = v_user_id");
    expect(rpcMigration).toContain("Incident not found for case or not owned by authenticated user");
  });

  it("replaces incident mentions atomically and upserts entities", () => {
    expect(rpcMigration).toContain("DELETE FROM public.entity_mentions em");
    expect(rpcMigration).toContain("em.incident_id = p_incident_id");
    expect(rpcMigration).toContain("INSERT INTO public.case_entities");
    expect(rpcMigration).toContain("ON CONFLICT (case_id, entity_type, normalized_name) DO UPDATE SET");
    expect(rpcMigration).toContain("INSERT INTO public.entity_mentions");
    expect(rpcMigration).toContain("ON CONFLICT (entity_id, incident_id, matched_text) DO UPDATE SET");
  });

  it("prevents duplicate mentions and makes replacement idempotent", () => {
    expect(rpcMigration).toContain("SELECT DISTINCT ON (ce.id, e.matched_text)");
    expect(rpcMigration).toContain("ORDER BY ce.id, e.matched_text, e.row_no");
    expect(rpcMigration).toContain("ON CONFLICT (entity_id, incident_id, matched_text) DO UPDATE SET");
    expect(rpcMigration).toContain("GET DIAGNOSTICS v_mention_count = ROW_COUNT");
  });

  it("stores relationships and prevents cross-case/self references", () => {
    expect(rpcMigration).toContain("INSERT INTO public.entity_relationships");
    expect(rpcMigration).toContain("ON CONFLICT (case_id, source_entity_id, target_entity_id, relationship_type) DO UPDATE SET");
    expect(rpcMigration).toContain("WHERE source_entity.id <> target_entity.id");
    expect(rpcMigration).toContain("source_entity.case_id = p_case_id");
    expect(rpcMigration).toContain("target_entity.case_id = p_case_id");
    expect(rpcMigration).toContain("source_entity.user_id = v_user_id");
    expect(rpcMigration).toContain("target_entity.user_id = v_user_id");
    expect(rpcMigration).toContain("Relationship endpoint does not reference an existing same-case entity");
    expect(rpcMigration).toContain("OR (r.source_type = r.target_type AND r.source_normalized_name = r.target_normalized_name)");
  });

  it("recalculates counts/timestamps, removes orphans, and returns structured counts", () => {
    expect(rpcMigration).toContain("mention_count = stats.mention_count");
    expect(rpcMigration).toContain("COUNT(em.id)::INTEGER AS mention_count");
    expect(rpcMigration).toContain("first_seen_at = stats.first_seen_at");
    expect(rpcMigration).toContain("MIN(em.occurred_at) AS first_seen_at");
    expect(rpcMigration).toContain("last_seen_at = stats.last_seen_at");
    expect(rpcMigration).toContain("MAX(em.occurred_at) AS last_seen_at");
    expect(rpcMigration).toContain("DELETE FROM public.case_entities ce");
    expect(rpcMigration).toContain("AND NOT EXISTS (SELECT 1 FROM public.entity_mentions em WHERE em.entity_id = ce.id)");
    expect(rpcMigration).toContain("AND NOT EXISTS (SELECT 1 FROM public.entity_relationships er WHERE er.source_entity_id = ce.id OR er.target_entity_id = ce.id)");
    expect(rpcMigration).toContain("deleted_orphan_count");
    expect(rpcMigration).toContain("entity_count");
    expect(rpcMigration).toContain("mention_count");
    expect(rpcMigration).toContain("relationship_count");
  });
});
