/** Unsent text per conversation, kept in memory while the app is open. */
const drafts = new Map<number, string>();

export function getDraft(conversationId: number): string {
  return drafts.get(conversationId) ?? "";
}

export function setDraft(conversationId: number, text: string) {
  if (text) drafts.set(conversationId, text);
  else drafts.delete(conversationId);
}

export function clearDrafts() {
  drafts.clear();
}
