import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AIUsageNotice } from "./components/AIUsageNotice";
import { AIWorkspaceEmptyState } from "./components/AIWorkspaceEmptyState";
import { AIWorkspaceErrorState } from "./components/AIWorkspaceErrorState";
import { AIWorkspaceHeader } from "./components/AIWorkspaceHeader";
import { AIWorkspaceSkeleton } from "./components/AIWorkspaceSkeleton";
import { BriefBuilder } from "./components/BriefBuilder";
import { CaseContextSelector } from "./components/CaseContextSelector";
import { ConversationPanel } from "./components/ConversationPanel";
import { ContradictionReview } from "./components/ContradictionReview";
import { FindingsPanel } from "./components/FindingsPanel";
import { IntelligenceOverview } from "./components/IntelligenceOverview";
import { SuggestedPrompts } from "./components/SuggestedPrompts";
import {
  buildCaseContextSummary,
  buildSuggestedPrompts,
  mapSourceReferences,
  normalizeAIError,
  normalizeAIResponse,
  parseSelectedCase,
} from "./aiWorkspaceUtils";
import { appendMessage, createConversationState, replaceMessage, resetConversationForCase } from "./aiWorkspaceState";
import type { AIMessage, AIWorkspaceCaseRow, AIWorkspaceIncidentRow, UsageNoticeState, WorkspaceStatus } from "./types";

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const availableNotice: UsageNoticeState = {
  state: "available",
  message: "Proof AI is available for the selected case.",
};

export const AIWorkspaceV2 = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState<AIWorkspaceCaseRow[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [incidents, setIncidents] = useState<AIWorkspaceIncidentRow[]>([]);
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>("loading");
  const [caseError, setCaseError] = useState<string | null>(null);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(searchParams.get("ask") === "1" ? "Summarize this case" : "");
  const [submitting, setSubmitting] = useState(false);
  const [usageNotice, setUsageNotice] = useState<UsageNoticeState>(availableNotice);
  const [conversation, setConversation] = useState(() => createConversationState(""));
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [contextCleared, setContextCleared] = useState(false);

  const selectedCase = useMemo(() => cases.find((caseRow) => caseRow.id === selectedCaseId) ?? null, [cases, selectedCaseId]);
  const summary = useMemo(() => selectedCase ? buildCaseContextSummary(selectedCase, incidents) : null, [incidents, selectedCase]);
  const suggestedPrompts = useMemo(() => buildSuggestedPrompts(summary), [summary]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setWorkspaceStatus("loading");
      setCaseError(null);
      const { data, error } = await supabase
        .from("cases")
        .select("id, title, category, description, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error("Proof AI case query failed", error.message);
        setCaseError("Cases could not be loaded. Check your connection and try again.");
        setWorkspaceStatus("error");
        return;
      }

      const rows = (data as AIWorkspaceCaseRow[] | null) ?? [];
      const requested = parseSelectedCase(searchParams.toString(), rows.map((caseRow) => caseRow.id));
      const nextCaseId = contextCleared ? "" : requested || rows[0]?.id || "";
      setCases(rows);
      setSelectedCaseId(nextCaseId);
      setConversation(createConversationState(nextCaseId));
      setWorkspaceStatus(rows.length ? "ready" : "idle");
    })();

    return () => {
      cancelled = true;
    };
  }, [contextCleared, searchParams, user]);

  useEffect(() => {
    if (!selectedCaseId || !cases.some((caseRow) => caseRow.id === selectedCaseId)) {
      setIncidents([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setIncidentError(null);
      const { data, error } = await supabase
        .from("incidents")
        .select("id, case_id, title, occurred_at, location, people_involved, tags, raw_narrative, neutral_summary, evidence_quality_score, ai_analysis, created_at, updated_at, evidence_items(id, type, filename, description, created_at)")
        .eq("case_id", selectedCaseId)
        .order("occurred_at", { ascending: true });

      if (cancelled) return;
      if (error) {
        console.error("Proof AI incident query failed", error.message);
        setIncidentError("Incident records could not be loaded for this case.");
        setIncidents([]);
        return;
      }
      setIncidents((data as AIWorkspaceIncidentRow[] | null) ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [cases, selectedCaseId]);

  const updateSelectedCase = (caseId: string) => {
    if (caseId === selectedCaseId) return;
    if (conversation.messages.length > 0) {
      const confirmed = window.confirm("Switch cases and clear the in-memory Proof AI conversation?");
      if (!confirmed) return;
    }
    setContextCleared(false);
    setSelectedCaseId(caseId);
    setConversation((current) => resetConversationForCase(current, caseId));
    setPrompt("");
    setUsageNotice(availableNotice);
    const params = new URLSearchParams(searchParams);
    if (caseId) params.set("case", caseId);
    else params.delete("case");
    setSearchParams(params, { replace: true });
  };

  const clearContext = () => {
    setContextCleared(true);
    setSelectedCaseId("");
    setIncidents([]);
    setConversation(createConversationState(""));
    setPrompt("");
    const params = new URLSearchParams(searchParams);
    params.delete("case");
    setSearchParams(params, { replace: true });
  };

  const newConversation = () => {
    setConversation(createConversationState(selectedCaseId));
    setPrompt("");
    setUsageNotice(availableNotice);
  };

  const submitPrompt = async (overridePrompt?: string) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text || !selectedCaseId || submitting) return;

    const userMessage: AIMessage = { id: createId("user"), role: "user", text, createdAt: new Date().toISOString() };
    const assistantId = createId("assistant");
    const loadingMessage: AIMessage = {
      id: assistantId,
      role: "assistant",
      status: "loading",
      answer: "Reviewing the selected case records…",
      findings: [],
      recommendations: [],
      sources: [],
      sourceMode: "none",
      createdAt: new Date().toISOString(),
    };

    setConversation((current) => appendMessage(appendMessage(current, userMessage), loadingMessage));
    setPrompt("");
    setLastPrompt(text);
    setSubmitting(true);
    setUsageNotice(availableNotice);

    try {
      const { data, error } = await supabase.functions.invoke("proof-ai", {
        body: { action: "summarize_case", prompt: text, caseId: selectedCaseId },
      });
      if (error) throw new Error(error.message || "Proof AI request failed.");

      const normalized = normalizeAIResponse(data as unknown);
      const mappedSources = mapSourceReferences(normalized.sources, incidents);
      const completeMessage: AIMessage = {
        id: assistantId,
        role: "assistant",
        status: "complete",
        title: normalized.title,
        answer: normalized.summary,
        findings: normalized.findings,
        recommendations: normalized.recommendations,
        sources: mappedSources.sources,
        sourceMode: mappedSources.mode,
        generatedAt: new Date().toISOString(),
        createdAt: loadingMessage.createdAt,
      };
      setConversation((current) => replaceMessage(current, completeMessage));
    } catch (error) {
      const normalizedError = normalizeAIError(error);
      setUsageNotice({ state: normalizedError.state, message: normalizedError.message, upgradeHref: normalizedError.state === "limit-reached" ? "/pricing" : undefined });
      const errorMessage: AIMessage = {
        id: assistantId,
        role: "assistant",
        status: "error",
        answer: normalizedError.message,
        error: normalizedError.message,
        findings: [],
        recommendations: [],
        sources: [],
        sourceMode: "none",
        createdAt: loadingMessage.createdAt,
      };
      setConversation((current) => replaceMessage(current, errorMessage));
    } finally {
      setSubmitting(false);
    }
  };

  const contextPanel = (
    <div className="space-y-4">
      <CaseContextSelector cases={cases} selectedCaseId={selectedCaseId} summary={summary} onSelectCase={updateSelectedCase} />
      {summary && <IntelligenceOverview summary={summary} />}
      {summary && incidents.length === 0 && <AIWorkspaceEmptyState variant="no-incidents" caseId={selectedCaseId} />}
      {summary && incidents.length > 0 && summary.evidenceCount === 0 && <AIWorkspaceEmptyState variant="no-evidence" caseId={selectedCaseId} />}
    </div>
  );

  const conversationPanel = (
    <div className="space-y-4">
      <AIUsageNotice notice={usageNotice} />
      {summary && conversation.messages.length === 0 && <SuggestedPrompts prompts={suggestedPrompts} disabled={submitting} onSelectPrompt={(value) => setPrompt(value)} />}
      {!selectedCaseId && <AIWorkspaceEmptyState variant="no-case-selected" onSelectCase={() => cases[0] && updateSelectedCase(cases[0].id)} />}
      <ConversationPanel
        messages={conversation.messages}
        prompt={prompt}
        disabled={!selectedCaseId || Boolean(incidentError)}
        submitting={submitting}
        selectedCaseTitle={selectedCase?.title}
        onPromptChange={setPrompt}
        onSubmit={() => void submitPrompt()}
        onRetry={lastPrompt ? () => void submitPrompt(lastPrompt) : undefined}
      />
    </div>
  );

  const findingsPanel = (
    <div className="space-y-4">
      {summary ? (
        <>
          <FindingsPanel findings={summary.findings} />
          <ContradictionReview items={summary.statementDifferences} />
          <BriefBuilder summary={summary} incidents={incidents} />
        </>
      ) : <AIWorkspaceEmptyState variant="no-case-selected" onSelectCase={() => cases[0] && updateSelectedCase(cases[0].id)} />}
    </div>
  );

  if (workspaceStatus === "loading") {
    return <AppLayout><AIWorkspaceSkeleton /></AppLayout>;
  }

  if (caseError) {
    return <AppLayout><main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10"><AIWorkspaceErrorState title="Proof AI unavailable" message={caseError} onRetry={() => window.location.reload()} /></main></AppLayout>;
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-[1600px] px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <AIWorkspaceHeader
          selectedCase={selectedCase}
          status={incidentError ? "error" : selectedCase ? "ready" : "idle"}
          recordCount={incidents.length}
          evidenceCount={summary?.evidenceCount ?? 0}
          onNewConversation={newConversation}
          onClearContext={clearContext}
        />

        {incidentError && <div className="mt-6"><AIWorkspaceErrorState title="Case records unavailable" message={incidentError} onRetry={() => window.location.reload()} /></div>}

        {cases.length === 0 ? (
          <div className="mt-6"><AIWorkspaceEmptyState variant="no-cases" /></div>
        ) : (
          <>
            <div className="mt-6 xl:hidden">
              <Tabs defaultValue="conversation">
                <TabsList className="grid h-12 w-full grid-cols-3 rounded-2xl border border-white/[0.06] bg-[#0B111A] p-1">
                  <TabsTrigger value="context" className="rounded-xl data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-200">Context</TabsTrigger>
                  <TabsTrigger value="conversation" className="rounded-xl data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-200">Chat</TabsTrigger>
                  <TabsTrigger value="findings" className="rounded-xl data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-200">Findings</TabsTrigger>
                </TabsList>
                <TabsContent value="context" className="mt-4 space-y-4">{contextPanel}</TabsContent>
                <TabsContent value="conversation" className="mt-4">{conversationPanel}</TabsContent>
                <TabsContent value="findings" className="mt-4 space-y-4">{findingsPanel}</TabsContent>
              </Tabs>
            </div>

            <div className="mt-6 hidden gap-6 xl:grid xl:grid-cols-[320px_minmax(0,1fr)_360px] xl:items-start">
              <aside className="space-y-4">{contextPanel}</aside>
              {conversationPanel}
              <aside className="space-y-4">{findingsPanel}</aside>
            </div>
          </>
        )}

        <footer className="mt-10 border-t border-white/[0.05] py-6 text-[11px] leading-relaxed text-slate-700">
          Proof organizes information supplied by the user. AI output may contain errors and should be reviewed against original records. Proof is not a law firm and does not provide legal advice.
        </footer>
      </main>
    </AppLayout>
  );
};

export default AIWorkspaceV2;
