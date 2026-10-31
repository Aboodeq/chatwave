/** Another user, as the API shows them to you (no contact details). */
export interface PublicUser {
  id: number;
  name: string;
  avatar: string | null;
  status_text: string;
  is_online: boolean;
  last_seen_at: string | null;
}

/** The signed-in user's own account. */
export interface User extends PublicUser {
  email: string;
  phone: string | null;
  created_at: string;
}
