import api from "../lib/axios";
import type { PublicUser } from "../types/user";

export async function getBlockedPeople(): Promise<PublicUser[]> {
  const res = await api.get("/blocks");
  return res.data.users;
}

export async function blockUser(userId: number): Promise<void> {
  await api.post(`/users/${userId}/block`);
}

export async function unblockUser(userId: number): Promise<void> {
  await api.delete(`/users/${userId}/block`);
}
