import api from "../lib/axios";
import type { User } from "../types/user";

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string | null;
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthResponse> {
  const res = await api.post("/auth/register", data);
  return res.data;
}

export async function login(data: {
  email: string;
  password: string;
  remember: boolean;
}): Promise<AuthResponse> {
  const res = await api.post("/auth/login", data);
  return res.data;
}

export async function logout(token?: string): Promise<void> {
  await api.post("/auth/logout", null, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
}

export async function getMe(): Promise<User> {
  const res = await api.get("/auth/me");
  return res.data.user;
}

export async function requestPasswordOtp(data: {
  email: string;
}): Promise<{ message: string; expires_in: number }> {
  const res = await api.post("/auth/password/otp", data);
  return res.data;
}

export async function verifyPasswordOtp(data: {
  email: string;
  otp: string;
}): Promise<{ message: string }> {
  const res = await api.post("/auth/password/otp/verify", data);
  return res.data;
}

export async function resetPasswordWithOtp(data: {
  email: string;
  otp: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  const res = await api.post("/auth/password/reset", data);
  return res.data;
}
