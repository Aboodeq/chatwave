import api from '../lib/axios';
import type { Message, Receipts } from '../types/message';

export interface MessagePage {
  messages: Message[];
  next_cursor: string | null;
  /** How far the other person has got (private chats; null where status isn't shown). */
  receipts?: Receipts | null;
}

/** One page of history, newest first. Pass next_cursor to get older messages. */
export async function getMessages(
  conversationId: number,
  cursor?: string | null,
  signal?: AbortSignal
): Promise<MessagePage> {
  const res = await api.get(`/conversations/${conversationId}/messages`, {
    params: cursor ? { cursor } : {},
    signal,
  });
  return res.data;
}

export async function sendMessage(
  conversationId: number,
  data: { body: string; reply_to_id?: number | null }
): Promise<Message> {
  const res = await api.post(`/conversations/${conversationId}/messages`, data);
  return res.data.message;
}

export async function editMessage(
  messageId: number,
  body: string
): Promise<Message> {
  const res = await api.put(`/messages/${messageId}`, { body });
  return res.data.message;
}

export async function deleteMessage(messageId: number): Promise<void> {
  await api.delete(`/messages/${messageId}`);
}

/** Marks messages read, up to the given one (the newest on screen). */
export async function markAsRead(conversationId: number, upToMessageId?: number): Promise<void> {
  await api.post(`/conversations/${conversationId}/read`, upToMessageId ? { message_id: upToMessageId } : {});
}