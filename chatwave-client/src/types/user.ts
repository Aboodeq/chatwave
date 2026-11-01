/** Another user, as the API shows them to you (no contact details). */
export interface PublicUser {
  id: number;
  name: string;
  avatar: string | null;
  status_text: string;
  is_online: boolean;
  last_seen_at: string | null;
}

/** Everything a role can allow (see the API's App\Enums\Permission). */
export type Permission =
  | "messages.status"
  | "receipts.hide"
  | "presence.hide"
  | "admin.overview"
  | "admin.people"
  | "admin.moderate"
  | "admin.roles"
  | "admin.activity"
  | "admin.system";

export interface RoleRef {
  id: number;
  /** "admin" or "member" for the built-in roles, null for ones admins created. */
  key: "admin" | "member" | null;
  name: string;
}

/** The signed-in user's own account. */
export interface User extends PublicUser {
  /** Null for accounts created with a phone number. */
  email: string | null;
  phone: string | null;
  role: RoleRef;
  permissions: Permission[];
  /** Privacy: whether others see when you've read their messages. */
  read_receipts: boolean;
  locale: "en" | "ar";
  /** Privacy: whether others may see when you're online and last active. */
  show_online_status: boolean;
  created_at: string;
}
