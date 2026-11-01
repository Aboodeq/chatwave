import type { User } from "../types/user";
import { formatInternational } from "./phone";

/** How someone signs in, for display: their email, or their phone number ("+962 7 9123 4567"). */
export function signInIdentifier(user: Pick<User, "email" | "phone"> | null | undefined): string {
  if (!user) return "";
  return user.email ?? (user.phone ? formatInternational(user.phone) : "");
}
