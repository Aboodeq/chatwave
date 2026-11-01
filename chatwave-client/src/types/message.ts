import type { PublicUser } from "./user";

export interface Message {
  id: number;
  conversation_id: number;
  sender: PublicUser;
  type: "text" | "image" | "file" | "audio" | "system";
  body: string | null;
  reply_to?: ReplyTo | null;
  /** Not included in a conversation's last_message preview. */
  media?: MessageMedia[];
  reactions?: MessageReaction[];
  /** On your own messages: whether it has reached the other person, and whether they've read it. */
  status?: MessageStatus | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export type MessageStatus = "sent" | "delivered" | "seen";

/** How far the other person in a private chat has got (null parts are hidden from you). */
export interface Receipts {
  delivered_up_to: number | null;
  read_up_to: number | null;
}

export interface ReplyTo {
  id: number;
  body: string | null;
  sender: PublicUser;
}

export interface MessageMedia {
  id: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  url: string;
  thumbnail_url: string | null;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: PublicUser[];
}
