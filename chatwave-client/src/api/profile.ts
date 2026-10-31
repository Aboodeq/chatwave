import api from "../lib/axios";
import type { User } from "../types/user";

export async function updateProfile(
  data: Partial<Pick<User, "name" | "status_text" | "show_online_status">>,
): Promise<User> {
  const res = await api.patch("/profile", data);
  return res.data.user;
}

export async function uploadAvatar(file: File): Promise<User> {
  const form = new FormData();
  form.append("avatar", file);
  const res = await api.post("/profile/avatar", form);
  return res.data.user;
}

export async function removeAvatar(): Promise<User> {
  const res = await api.delete("/profile/avatar");
  return res.data.user;
}

export async function changePassword(data: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string; signed_out_sessions: number }> {
  const res = await api.put("/profile/password", data);
  return res.data;
}
