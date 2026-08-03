import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Network, Sparkles, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ContextualLoading } from "@/components/ContextualLoading";
import { Button } from "@/components/ui/button";
import { GlobalErrorState } from "@/features/release-v1/components/GlobalErrorState";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type CaseRow = Pick<Tables<"cases">, "id" | "title" | "category">;
type IncidentRow = Pick<Tables<"incidents">, "id" | "title">;
type EntityRow = Tables<"case_entities">;
type RelationshipRow = Tables<"entity_relationships">;

const formatEntityType = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const EntityIntelligence = () => {
  const { id } = useParams<{ id: string }>();
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [caseResult, incidentResult, entityResult, relationshipResult] = await Promise.all([
        supabase.from("cases").select("id,title,category").eq("id", id).maybeSingle(),
        supabase.from("incidents").select("id,title").eq("case_id", id).order("occurred_at", { ascending: false }),
        supabase.from("case_entities").select("*").eq("case_id", id).order("mention_count", { ascending: false }),
        supabase.from("entity_relationships").select("*").eq("case_id", id).order("mention_count", { ascending: false }),
      ]);
      if (cancelled) return;
      const firstError = caseResult.error || incidentResult.error || entityResult.error || relationshipResult.error;
      if (firstError) {
        setError("Entity records could not be loaded. Check your connection and try again.");
      } else {
        setCaseRow(caseResult.data as CaseRow | null);
        setIncidents((incidentResult.data as IncidentRow[] | null) ?? []);
        setEntities((entityResult.data as EntityRow[] | null) ?? []);
        setRelationships((relationshipResult.data as RelationshipRow[] | null) ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const entityNames = useMemo(() => new Map(entities.map((entity) => [entity.id, entity.canonical_name])), [entities]);
  const firstIncident = incidents[0];

  if (loading) return <AppLayout><ContextualLoading title="Connecting people and evidence…" detail="Loading entities, mentions, and relationships from this case." /></AppLayout>;
  if (error) return <AppLayout><main className="mx-auto max-w-4xl px-4 py-10"><GlobalErrorState title="Entity Intelligence unavailable" message={error} onRetry={() => globalThis.location.reload()} /></main></AppLayout>;

  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <Link to={id ? `/cases/${id}` : "/cases"} className="inline-flex items-center text-xs font-mono text-slate-500 hover:text-slate-200"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back to case</Link>
        <header className="mt-6 rounded-[30px] border border-violet-300/15 bg-[#0B111A] p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">Entity Intelligence</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">{caseRow?.title ?? "Case connections"}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Review people, places, organizations, and relationships extracted from documented incidents. Confirm important connections against original records.</p>
        </header>

        {entities.length === 0 ? (
          <section className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-[#0B111A] p-8 text-center sm:p-10">
            <Network className="mx-auto h-9 w-9 text-violet-300" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-black tracking-[-0.035em] text-white">{incidents.length === 0 ? "Your first incident starts the entity map" : "Identify connections in this case"}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{incidents.length === 0 ? "Add an incident with names, locations, organizations, or evidence. Proof can then connect recurring entities across the record." : "Run Entity Analysis on an incident. Proof will identify recurring people, places, organizations, and evidence links for review here."}</p>
            <Button asChild className="mt-5 rounded-xl bg-violet-500 font-bold hover:bg-violet-400">
              <Link to={firstIncident ? `/incidents/${firstIncident.id}` : `/record?caseId=${id}`}><Sparkles className="mr-2 h-4 w-4" />{firstIncident ? "Analyze first incident" : "Create first incident"}</Link>
            </Button>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <section className="rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6" aria-labelledby="entities-title">
              <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Available record overview</p><h2 id="entities-title" className="mt-1 text-2xl font-black text-white">{entities.length} identified entities</h2></div><Users className="h-5 w-5 text-violet-300" /></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {entities.map((entity) => <article key={entity.id} className="min-w-0 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">{formatEntityType(entity.entity_type)}</p><h3 className="mt-1 break-words text-base font-black text-white">{entity.canonical_name}</h3><p className="mt-2 text-xs text-slate-500">{entity.mention_count} mention{entity.mention_count === 1 ? "" : "s"}</p></article>)}
              </div>
            </section>
            <section className="rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6" aria-labelledby="relationships-title">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Relationship review</p><h2 id="relationships-title" className="mt-1 text-2xl font-black text-white">Connected records</h2>
              {relationships.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-slate-500">Entities are identified, but no cross-record relationships are available yet. Analyze more incidents to reveal recurring connections.</p> : <ul className="mt-5 space-y-3">{relationships.map((relationship) => <li key={relationship.id} className="rounded-2xl bg-white/[0.03] p-4"><p className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-200"><span className="min-w-0 break-words">{entityNames.get(relationship.source_entity_id) ?? "Entity"}</span><ArrowRight className="h-4 w-4 shrink-0 text-violet-300" /><span className="min-w-0 break-words">{entityNames.get(relationship.target_entity_id) ?? "Entity"}</span></p><p className="mt-2 text-xs uppercase tracking-wide text-slate-600">{formatEntityType(relationship.relationship_type)} · {relationship.mention_count} link{relationship.mention_count === 1 ? "" : "s"}</p></li>)}</ul>}
            </section>
          </div>
        )}
      </main>
    </AppLayout>
  );
};

export default EntityIntelligence;