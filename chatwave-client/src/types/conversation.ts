import type { PublicUser } from "./user";
import type { Message } from "./message";

export interface Conversation {
  id: number;
  type: "private" | "group";
  name: string | null;
  avatar: string | null;
  is_online: boolean | null;
  last_seen_at: string | null;
  last_message: Message | null;
  unread_count: number;
  participant: PublicUser | null;
  group: Group | null;
  /** You blocked the other person (private chats). */
  is_blocked: boolean;
  /** False when either person in a private chat blocked the other. */
  can_message: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  avatar: string | null;
}
