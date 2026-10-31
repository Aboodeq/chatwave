import api from "../lib/axios";
import type { PublicUser } from "../types/user";

/** People matching part of a name, or an exact email address. */
export async function searchUsers(search: string, signal?: AbortSignal): Promise<PublicUser[]> {
  const res = await api.get("/users", { params: { search }, signal });
  return res.data.users;
}
