import { describe, expect, it } from "vitest";
import { appendMessage, canSubmitPrompt, createConversationState, replaceMessage, resetConversationForCase } from "../aiWorkspaceState";
import type { AIMessage } from "../types";

const userMessage = (id: string, createdAt: string): AIMessage => ({
  id,
  role: "user",
  text: id,
  createdAt,
});

const assistantMessage = (id: string, createdAt: string, status: "loading" | "complete" | "error" = "loading"): AIMessage => ({
  id,
  role: "assistant",
  status,
  answer: "Answer",
  findings: [],
  recommendations: [],
  sources: [],
  sourceMode: "none",
  createdAt,
});

describe("aiWorkspaceState", () => {
  it("preserves chronological message ordering", () => {
    const state = createConversationState("case-1");
    const updated = appendMessage(appendMessage(state, userMessage("later", "2026-07-01T10:05:00.000Z")), userMessage("earlier", "2026-07-01T10:00:00.000Z"));

    expect(updated.messages.map((message) => message.id)).toEqual(["earlier", "later"]);
  });

  it("replaces loading assistant messages with completed responses", () => {
    const state = appendMessage(createConversationState("case-1"), assistantMessage("assistant-1", "2026-07-01T10:00:00.000Z"));
    const replaced = replaceMessage(state, assistantMessage("assistant-1", "2026-07-01T10:00:00.000Z", "complete"));

    expect(replaced.messages).toHaveLength(1);
    expect(replaced.messages[0]).toMatchObject({ id: "assistant-1", role: "assistant", status: "complete" });
  });

  it("resets conversation when the selected case changes", () => {
    const state = appendMessage(createConversationState("case-1"), userMessage("message", "2026-07-01T10:00:00.000Z"));
    const reset = resetConversationForCase(state, "case-2");

    expect(reset.caseId).toBe("case-2");
    expect(reset.messages).toEqual([]);
  });

  it("keeps conversation when the selected case is unchanged", () => {
    const state = appendMessage(createConversationState("case-1"), userMessage("message", "2026-07-01T10:00:00.000Z"));
    expect(resetConversationForCase(state, "case-1")).toBe(state);
  });

  it("rejects empty prompts and concurrent submissions", () => {
    expect(canSubmitPrompt("   ", false)).toBe(false);
    expect(canSubmitPrompt("Summarize", true)).toBe(false);
    expect(canSubmitPrompt("Summarize", false)).toBe(true);
  });
});
