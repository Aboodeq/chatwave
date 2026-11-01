/** Another user, as the API shows them to you (no contact details). */
export interface PublicUser {
  id: number;
  name: string;
  avatar: string | null;
  status_text: string;
  is_online: boolean;
  last_seen_at: string | null;
}

export type Role = "user" | "admin";

/** The signed-in user's own account. */
export interface User extends PublicUser {
  /** Null for accounts created with a phone number. */
  email: string | null;
  phone: string | null;
  role: Role;
  /** Privacy: whether others may see when you're online and last active. */
  show_online_status: boolean;
  created_at: string;
}
