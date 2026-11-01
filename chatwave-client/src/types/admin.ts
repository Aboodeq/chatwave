import type { Permission, RoleRef } from "./user";

/** A person as admins see them. */
export interface AdminUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  status_text: string;
  role: RoleRef;
  /** Their role includes at least one admin permission. */
  has_admin_access: boolean;
  sign_up_method: "email" | "phone";
  verified: boolean;
  is_online: boolean;
  last_seen_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  messages_count?: number;
  conversations_count?: number;
}

export interface PersonRef {
  id: number;
  name: string;
  avatar: string | null;
}

/** A role, as the roles page shows it. */
export interface AdminRole {
  id: number;
  /** "admin" or "member" for the built-in roles (their names are translated), null otherwise. */
  key: RoleRef["key"];
  name: string;
  description: string | null;
  permissions: Permission[];
  /** The Admin role: always every permission, can't be edited. */
  locked: boolean;
  deletable: boolean;
  users_count: number;
}

export interface RolesResponse {
  roles: AdminRole[];
  /** Every permission there is, in display order. */
  permissions: Permission[];
}

export interface RoleInput {
  name: string;
  description: string | null;
  permissions: Permission[];
}

export type AdminActionType =
  | "user.suspended"
  | "user.restored"
  | "user.role_changed"
  | "user.signed_out"
  | "role.created"
  | "role.updated"
  | "role.deleted";

/** One entry in the admin audit log. */
export interface AdminActionEntry {
  id: number;
  action: AdminActionType | (string & {});
  details: {
    reason?: string;
    /** Role names at the time; keys for built-in roles (older entries may hold "admin"/"user"). */
    from?: string;
    to?: string;
    from_key?: "admin" | "member";
    to_key?: "admin" | "member";
    devices?: number;
    role?: string;
    role_key?: "admin" | "member";
    added?: Permission[];
    removed?: Permission[];
    moved?: number;
  };
  created_at: string;
  admin: PersonRef | null;
  target: PersonRef | null;
}

export type RangeDays = 7 | 30 | 90;

export interface DailyActivity {
  /** "2026-10-31", in the admin's time zone. */
  date: string;
  messages: number;
  senders: number;
  sign_ups: number;
}

export interface Overview {
  range: { days: RangeDays; timezone: string; from: string; to: string };
  totals: {
    people: number;
    sign_ups: number;
    sign_ups_previous: number;
    online_now: number;
    active_today: number;
    messages: number;
    messages_previous: number;
    conversations: number;
    admins: number;
    suspended: number;
    phone_accounts: number;
  };
  series: DailyActivity[];
  recent_sign_ups: AdminUser[];
  recent_activity: AdminActionEntry[];
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
}

export interface PeopleQuery {
  search?: string;
  status?: "all" | "active" | "suspended" | "online";
  /** A role id, or "all". */
  role?: string;
  method?: "all" | "email" | "phone";
  sort?: string;
  page?: number;
}

export interface PersonDetail {
  user: AdminUser;
  stats: { messages: number; conversations: number; blocked_by: number; blocking: number };
  devices: { id: number; user_agent: string | null; created_at: string | null; last_used_at: string | null }[];
  activity: AdminActionEntry[];
  is_last_admin: boolean;
}

export type CheckStatus = "ok" | "info" | "warning" | "problem";

export interface SystemInfo {
  app: { environment: string; debug: boolean; laravel: string; php: string; timezone: string };
  services: {
    database: string;
    database_size: number | null;
    queue: string;
    pending_jobs: number | null;
    failed_jobs: number;
    mail: string;
    sms: string;
  };
  storage: { avatars: number; avatar_bytes: number };
  checks: { key: string; status: CheckStatus; title: string; detail: string }[];
}
