export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  status_text: string;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
}