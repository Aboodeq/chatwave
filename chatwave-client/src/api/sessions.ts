import api from "../lib/axios";

/** A device the account is signed in on. */
export interface Session {
  id: number;
  /** The browser's user agent at sign-in; null for sessions from before this was recorded. */
  user_agent: string | null;
  created_at: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  current: boolean;
}

export async function getSessions(): Promise<Session[]> {
  const res = await api.get("/sessions");
  return res.data.sessions;
}

export async function revokeSession(id: number): Promise<void> {
  await api.delete(`/sessions/${id}`);
}

/** Signs out every device except this one; returns how many were signed out. */
export async function revokeOtherSessions(): Promise<number> {
  const res = await api.delete("/sessions");
  return res.data.signed_out;
}
