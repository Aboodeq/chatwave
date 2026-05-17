import api from '../lib/axios';
import type { Conversation } from '../types/conversation';

export async function getConversations(): Promise<Conversation[]> {
  const res = await api.get('/conversations');
  return res.data.conversations;
}

export async function createConversation(userId: number): Promise<Conversation> {
  const res = await api.post('/conversations', { user_id: userId });
  return res.data.conversation;
}

export async function getConversation(id: number): Promise<Conversation> {
  const res = await api.get(`/conversations/${id}`);
  return res.data.conversation;
}

export async function leaveConversation(id: number): Promise<void> {
  await api.delete(`/conversations/${id}`);
}