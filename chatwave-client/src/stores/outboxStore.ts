import { create } from "zustand";
import type { ReplyTo } from "../types/message";

/** A message shown immediately while it is being sent (or after sending failed). */
export interface PendingMessage {
  clientId: string;
  conversationId: number;
  body: string;
  replyTo: ReplyTo | null;
  createdAt: string;
  status: "sending" | "failed";
}

interface OutboxState {
  pending: PendingMessage[];
  add: (message: PendingMessage) => void;
  setStatus: (clientId: string, status: PendingMessage["status"]) => void;
  remove: (clientId: string) => void;
}

export const useOutboxStore = create<OutboxState>((set) => ({
  pending: [],
  add: (message) => set((state) => ({ pending: [...state.pending, message] })),
  setStatus: (clientId, status) =>
    set((state) => ({
      pending: state.pending.map((m) => (m.clientId === clientId ? { ...m, status } : m)),
    })),
  remove: (clientId) =>
    set((state) => ({ pending: state.pending.filter((m) => m.clientId !== clientId) })),
}));
