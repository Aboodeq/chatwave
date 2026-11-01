import i18n from "../i18n";
import type { Permission, RoleRef } from "../types/user";

type RoleKey = NonNullable<RoleRef["key"]>;

/** Built-in roles are named in the viewer's language; roles admins made keep their names. */
export function roleName(role: { key: RoleKey | null; name: string }): string {
  return role.key ? i18n.t(`admin.roleNames.${role.key}`) : role.name;
}

/**
 * A role name from the audit log: built-in roles by key, and the values older entries
 * stored ("admin"/"user") as the roles they meant.
 */
export function loggedRoleName(name: string | undefined, key: RoleKey | undefined): string {
  if (key) return i18n.t(`admin.roleNames.${key}`);
  if (name === "admin") return i18n.t("admin.roleNames.admin");
  if (name === "user") return i18n.t("admin.roleNames.member");
  return name ?? "";
}

/** The permissions, grouped the way the roles editor shows them. */
export const PERMISSION_GROUPS: { id: "messaging" | "dashboard"; permissions: Permission[] }[] = [
  { id: "messaging", permissions: ["messages.status", "receipts.hide", "presence.hide"] },
  {
    id: "dashboard",
    permissions: ["admin.overview", "admin.people", "admin.moderate", "admin.roles", "admin.activity", "admin.system"],
  },
];

export const permissionLabel = (permission: Permission) => i18n.t(`admin.roles.permissions.${permission}.label`);
export const permissionDescription = (permission: Permission) => i18n.t(`admin.roles.permissions.${permission}.description`);

export const opensDashboard = (permissions: Permission[]) => permissions.some((p) => p.startsWith("admin."));
