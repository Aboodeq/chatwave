import api from '../lib/axios';
import type { Message } from '../types/message';

export interface MessagePage {
  messages: Message[];
  next_cursor: string | null;
}

export async function getMessages(
  conversationId: number,
  cursor?: string
): Promise<MessagePage> {
  const res = await api.get(`/conversations/${conversationId}/messages`, {
    params: cursor ? { cursor } : {},
  });
  return res.data;
}

export async function sendMessage(
  conversationId: number,
  data: { body?: string; type?: string; reply_to_id?: number }
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

export async function markAsRead(conversationId: number): Promise<void> {
  await api.post(`/conversations/${conversationId}/read`);
}