import api from "../lib/axios";
import type {
  AdminActionEntry,
  AdminRole,
  AdminUser,
  Overview,
  Paginated,
  PeopleQuery,
  PersonDetail,
  RangeDays,
  RoleInput,
  RolesResponse,
  SystemInfo,
} from "../types/admin";

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

export async function setRole(id: number, roleId: number): Promise<AdminUser> {
  const res = await api.put(`/admin/users/${id}/role`, { role_id: roleId });
  return res.data.user;
}

export async function getRoles(): Promise<RolesResponse> {
  const res = await api.get("/admin/roles");
  return res.data;
}

export async function createRole(input: RoleInput): Promise<AdminRole> {
  const res = await api.post("/admin/roles", input);
  return res.data.role;
}

export async function updateRole(id: number, input: RoleInput): Promise<AdminRole> {
  const res = await api.put(`/admin/roles/${id}`, input);
  return res.data.role;
}

/** Deletes a role; its people become Members. Returns how many moved. */
export async function deleteRole(id: number): Promise<number> {
  const res = await api.delete(`/admin/roles/${id}`);
  return res.data.moved_to_member;
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
