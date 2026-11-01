import api from "../lib/axios";
import type { AdminActionEntry, AdminUser, Overview, Paginated, PeopleQuery, PersonDetail, RangeDays, SystemInfo } from "../types/admin";
import type { Role } from "../types/user";

export async function getOverview(days: RangeDays, timezone: string): Promise<Overview> {
  const res = await api.get("/admin/overview", { params: { days, timezone } });
  return res.data;
}

export async function getPeople(query: PeopleQuery): Promise<Paginated<AdminUser>> {
  const params = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== "" && value !== "all"));
  const res = await api.get("/admin/users", { params });
  return res.data;
}

export async function getPerson(id: number): Promise<PersonDetail> {
  const res = await api.get(`/admin/users/${id}`);
  return res.data;
}

export async function suspendPerson(id: number, reason: string): Promise<AdminUser> {
  const res = await api.post(`/admin/users/${id}/suspension`, { reason: reason.trim() || null });
  return res.data.user;
}

export async function restorePerson(id: number): Promise<AdminUser> {
  const res = await api.delete(`/admin/users/${id}/suspension`);
  return res.data.user;
}

export async function setRole(id: number, role: Role): Promise<AdminUser> {
  const res = await api.put(`/admin/users/${id}/role`, { role });
  return res.data.user;
}

export async function signOutEverywhere(id: number): Promise<AdminUser> {
  const res = await api.delete(`/admin/users/${id}/sessions`);
  return res.data.user;
}

export async function getActivity(page: number): Promise<Paginated<AdminActionEntry>> {
  const res = await api.get("/admin/activity", { params: { page } });
  return res.data;
}

export async function getSystem(): Promise<SystemInfo> {
  const res = await api.get("/admin/system");
  return res.data;
}
