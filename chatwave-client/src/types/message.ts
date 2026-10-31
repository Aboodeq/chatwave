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
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  deleted_at: string | null;
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
