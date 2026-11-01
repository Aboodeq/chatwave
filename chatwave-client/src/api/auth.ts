import api from "../lib/axios";
import type { User } from "../types/user";

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string | null;
}

/** An email address, or a phone number in E.164 form (+962791234567). */
export type Contact = { email: string } | { phone: string };

export interface CodeSent {
  message: string;
  expires_in: number;
  /** Local development only, when text messages aren't really sent. */
  dev_code?: string;
}

/** Signing up with a phone number: text a code to it first. */
export async function requestRegistrationCode(phone: string): Promise<CodeSent> {
  const res = await api.post("/auth/register/code", { phone });
  return res.data;
}

export async function register(
  data: Contact & { name: string; password: string; password_confirmation: string; otp?: string },
): Promise<AuthResponse> {
  const res = await api.post("/auth/register", data);
  return res.data;
}

export async function login(data: Contact & { password: string; remember: boolean }): Promise<AuthResponse> {
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

export async function requestPasswordOtp(data: Contact): Promise<CodeSent> {
  const res = await api.post("/auth/password/otp", data);
  return res.data;
}

export async function verifyPasswordOtp(data: Contact & { otp: string }): Promise<{ message: string }> {
  const res = await api.post("/auth/password/otp/verify", data);
  return res.data;
}

export async function resetPasswordWithOtp(
  data: Contact & { otp: string; password: string; password_confirmation: string },
): Promise<{ message: string }> {
  const res = await api.post("/auth/password/reset", data);
  return res.data;
}
