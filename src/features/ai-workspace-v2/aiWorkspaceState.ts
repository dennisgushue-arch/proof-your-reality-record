import type { AIMessage } from "./types";

export type ConversationState = {
  caseId: string;
  messages: AIMessage[];
};

export function createConversationState(caseId: string): ConversationState {
  return { caseId, messages: [] };
}

export function appendMessage(state: ConversationState, message: AIMessage): ConversationState {
  return { ...state, messages: [...state.messages, message].sort(compareMessages) };
}

export function replaceMessage(state: ConversationState, message: AIMessage): ConversationState {
  const exists = state.messages.some((item) => item.id === message.id);
  const messages = exists
    ? state.messages.map((item) => (item.id === message.id ? message : item))
    : [...state.messages, message];
  return { ...state, messages: messages.sort(compareMessages) };
}

export function resetConversationForCase(state: ConversationState, nextCaseId: string): ConversationState {
  if (state.caseId === nextCaseId) return state;
  return createConversationState(nextCaseId);
}

export function canSubmitPrompt(prompt: string, submitting: boolean): boolean {
  return prompt.trim().length > 0 && !submitting;
}

function compareMessages(first: AIMessage, second: AIMessage): number {
  const firstTime = new Date(first.createdAt).getTime();
  const secondTime = new Date(second.createdAt).getTime();
  if (firstTime === secondTime) return first.id.localeCompare(second.id);
  return firstTime - secondTime;
}
