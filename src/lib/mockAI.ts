import type { AIAnalysis } from "@/lib/aiAnalysis";

export type { AIAnalysis } from "@/lib/aiAnalysis";

const EMOTIONAL_WORDS = /\b(angry|furious|hate|stupid|awful|terrible|amazing|crazy|insane|ridiculous|outrageous|disgusting|horrible|absolutely|literally|totally|so much|ugh)\b/gi;

export function analyzeNarrative(input: {
  title: string;
  narrative: string;
  occurred_at: string;
  location?: string | null;
  people?: string[];
}): AIAnalysis {
  const narrative = input.narrative.trim();
  const sentences = narrative
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const neutral = sentences.slice(0, 3).join(" ") || `On ${new Date(input.occurred_at).toLocaleString()}, an incident was recorded titled "${input.title}".`;

  const timeline: string[] = [];
  timeline.push(`${new Date(input.occurred_at).toLocaleString()} — Incident "${input.title}" begins${input.location ? ` at ${input.location}` : ""}.`);
  sentences.slice(0, 4).forEach((s, i) => timeline.push(`Step ${i + 1}: ${s.replace(EMOTIONAL_WORDS, "").replace(/\s+/g, " ").trim()}`));

  const claims = sentences
    .filter((s) => /\b(promise|agreed|said|told|stated|claimed|will|would)\b/i.test(s))
    .slice(0, 4);

  const contradictions = sentences
    .filter((s) => /\b(but|however|actually|earlier|previously|despite)\b/i.test(s))
    .slice(0, 3)
    .map((s) => `Possible contradiction: "${s}"`);

  const missing: string[] = [];
  if (!/photo|picture|image|screenshot/i.test(narrative)) missing.push("Photo or screenshot evidence");
  if (!/text|message|email|sms/i.test(narrative)) missing.push("Text message or email thread");
  if (input.people && input.people.length > 0) missing.push("Witness statement from third party");
  if (!input.location) missing.push("Specific address or GPS location");

  const followUps = [
    "Save any related text/email threads within 24 hours.",
    "Write down anything else you remember while it's fresh.",
  ];

  const cleaned = narrative.replace(EMOTIONAL_WORDS, "[removed]").replace(/!{2,}/g, ".").replace(/\?{2,}/g, "?");

  // Score: based on length, specificity, people, location, time precision
  let score = 40;
  if (narrative.length > 200) score += 15;
  if (narrative.length > 600) score += 10;
  if (input.location) score += 10;
  if (input.people && input.people.length) score += 10;
  if (/\d{1,2}:\d{2}/.test(narrative)) score += 8;
  if (missing.length <= 1) score += 7;
  score = Math.min(100, Math.max(0, score));

  return {
    neutral_summary: neutral,
    timeline,
    key_claims: claims.length ? claims : ["No explicit claims or promises detected."],
    contradictions: contradictions.length ? contradictions : [],
    missing_evidence: missing,
    follow_ups: followUps,
    emotional_language_removed: cleaned,
    evidence_quality_score: score,
  };
}
