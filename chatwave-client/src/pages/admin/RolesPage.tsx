import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "radix-ui";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { LockKeyhole, Pencil, Plus, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { useRoleActions, useRoles } from "../../hooks/useAdmin";
import { getErrorMessage, getFieldErrors } from "../../lib/errors";
import { opensDashboard, PERMISSION_GROUPS, permissionDescription, permissionLabel, roleName } from "../../lib/roles";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import type { AdminRole } from "../../types/admin";
import type { Permission } from "../../types/user";
import { ConfirmDialog } from "../../components/admin/ConfirmDialog";
import { PageHeader } from "../../components/admin/PageHeader";
import { formatCount } from "../../components/admin/charts/chartUtils";
import { Button } from "../../components/ui/Button";
import { IconButton } from "../../components/ui/IconButton";
import { Skeleton } from "../../components/ui/Skeleton";
import { Switch } from "../../components/ui/Switch";
import { TextField } from "../../components/ui/TextField";

/**
 * Roles and what each one allows. Everyone has exactly one role; the Admin role always has
 * everything. Needs the "admin.roles" permission (the API enforces the same rules).
 */
export default function RolesPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } = useRoles();
  const actions = useRoleActions();
  const [editing, setEditing] = useState<AdminRole | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminRole | null>(null);

  return (
    <>
      <PageHeader
        title={t("admin.roles.title")}
        description={t("admin.roles.description")}
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden="true" />
            {t("admin.roles.new")}
          </Button>
        }
      />

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2" aria-label={t("admin.roles.loading")}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl bg-surface p-10 text-center shadow-soft ring-1 ring-line">
          <p className="text-sm text-fg-muted">{t("admin.roles.loadFailed")}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : (
        <div className="stagger-rise grid gap-4 md:grid-cols-2">
          {data.roles.map((role) => (
            <RoleCard key={role.id} role={role} onEdit={() => setEditing(role)} onDelete={() => setDeleting(role)} />
          ))}
        </div>
      )}

      <RoleEditor
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        open={editing !== null}
        role={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("admin.roles.deleteDialog.title", { name: deleting ? roleName(deleting) : "" })}
        description={
          deleting?.users_count
            ? t("admin.roles.deleteDialog.people", { count: formatCount(deleting.users_count) })
            : t("admin.roles.deleteDialog.empty")
        }
        confirmLabel={t("admin.roles.deleteDialog.confirm")}
        danger
        pending={actions.remove.isPending}
        onConfirm={() => deleting && actions.remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}

function RoleCard({ role, onEdit, onDelete }: { role: AdminRole; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const mine = me?.role?.id === role.id;
  // Only admins can change the role they're in themselves (and nobody can change Admin).
  const editable = !role.locked && (!mine || me?.role?.key === "admin");
  const Icon = opensDashboard(role.permissions) ? ShieldCheck : UsersRound;

  return (
    <section className="flex flex-col rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line sm:p-6">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            opensDashboard(role.permissions) ? "bg-primary-soft text-primary-soft-fg" : "bg-surface-2 text-fg-muted",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold text-fg">
            <bdi>{roleName(role)}</bdi>
            {role.key && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.6875rem] font-medium text-fg-muted">
                {t("admin.roles.builtIn")}
              </span>
            )}
            {mine && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[0.6875rem] font-medium text-primary-soft-fg">
                {t("admin.roles.yourRole")}
              </span>
            )}
          </h2>
          {(role.key || role.description) && (
            <p dir={role.key ? undefined : "auto"} className="mt-1 text-sm text-fg-muted">
              {role.key ? t(`admin.roleDescriptions.${role.key}`) : role.description}
            </p>
          )}
          <Link
            to={`/admin/people?role=${role.id}`}
            className="mt-2 inline-block text-[0.8125rem] font-medium text-primary hover:underline"
          >
            {t("admin.roles.peopleCount", { count: role.users_count })}
          </Link>
        </div>
      </div>

      <div className="mt-4 flex-1 border-t border-line pt-4">
        {role.locked ? (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <LockKeyhole className="size-4 shrink-0" aria-hidden="true" />
            {t("admin.roles.locked")}
          </p>
        ) : role.permissions.length === 0 ? (
          <p className="text-sm text-fg-subtle">{t("admin.roles.noPermissions")}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" aria-label={t("admin.roles.form.permissions")}>
            {role.permissions.map((permission) => (
              <li
                key={permission}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  permission.startsWith("admin.") ? "bg-primary-soft text-primary-soft-fg" : "bg-surface-2 text-fg-muted",
                )}
              >
                {permissionLabel(permission)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!role.locked && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" disabled={!editable} onClick={onEdit}>
            <Pencil className="size-3.5" aria-hidden="true" />
            {t("admin.roles.edit")}
          </Button>
          {role.deletable && (
            <Button
              variant="ghost"
              size="sm"
              disabled={!editable}
              onClick={onDelete}
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t("admin.roles.delete")}
            </Button>
          )}
          {!editable && <p className="text-xs text-fg-subtle">{t("admin.roles.ownRoleNote")}</p>}
        </div>
      )}
    </section>
  );
}

/** Create a role, or change one: its name, description and permissions, in groups. */
function RoleEditor({ open, role, onClose }: { open: boolean; role: AdminRole | null; onClose: () => void }) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const { create, update } = useRoleActions();
  const builtIn = Boolean(role?.key);
  const [name, setName] = useState(role ? roleName(role) : "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [granted, setGranted] = useState<Set<Permission>>(() => new Set(role?.permissions ?? []));
  const [nameError, setNameError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  // Nobody can hand out access they don't have themselves (admins have everything).
  const canGrant = (permission: Permission) => me?.role?.key === "admin" || (me?.permissions?.includes(permission) ?? false);

  const toggle = (permission: Permission, on: boolean) =>
    setGranted((current) => {
      const next = new Set(current);
      if (on) next.add(permission);
      else next.delete(permission);
      return next;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!builtIn && trimmed.length === 0) return setNameError(t("admin.roles.form.nameRequired"));
    if (!builtIn && trimmed.length < 2) return setNameError(t("admin.roles.form.nameMin"));
    setNameError(null);

    // Built-in roles keep their stored name and description (the app translates them).
    const input = {
      name: builtIn && role ? role.name : trimmed,
      description: builtIn && role ? role.description : description.trim() || null,
      permissions: PERMISSION_GROUPS.flatMap((group) => group.permissions).filter((permission) => granted.has(permission)),
    };
    const onError = (error: unknown) => {
      const fields = getFieldErrors(error);
      if (fields.name) setNameError(fields.name);
      else toast.error(getErrorMessage(error, t("admin.roles.toasts.saveFailed")));
    };

    if (role) update.mutate({ id: role.id, input }, { onSuccess: onClose, onError });
    else create.mutate(input, { onSuccess: onClose, onError });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-[#04121a]/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-x-3 top-[5vh] z-50 mx-auto flex max-h-[90vh] max-w-xl animate-pop flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop outline-none">
          <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <div>
                <Dialog.Title className="font-display text-lg font-semibold">
                  {role ? t("admin.roles.form.editTitle", { name: roleName(role) }) : t("admin.roles.form.createTitle")}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-fg-muted">{t("admin.roles.form.intro")}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <IconButton icon={X} label={t("common.close")} size="sm" className="-me-1.5" />
              </Dialog.Close>
            </div>

            <div className="scrollbar-thin mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6">
              <TextField
                label={t("admin.roles.form.name")}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(null);
                }}
                placeholder={t("admin.roles.form.namePlaceholder")}
                maxLength={50}
                disabled={builtIn}
                error={nameError ?? undefined}
                hint={builtIn ? t("admin.roles.form.nameBuiltIn") : undefined}
                autoFocus={!builtIn}
              />

              {!builtIn && (
                <div className="space-y-1.5">
                  <label htmlFor="role-description" className="text-sm font-medium text-fg">
                    {t("admin.roles.form.description")}{" "}
                    <span className="font-normal text-fg-subtle">{t("admin.confirm.optional")}</span>
                  </label>
                  <textarea
                    id="role-description"
                    dir="auto"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={255}
                    rows={2}
                    placeholder={t("admin.roles.form.descriptionPlaceholder")}
                    className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-base text-fg shadow-soft outline-none placeholder:text-fg-subtle/80 focus:border-primary focus:ring-4 focus:ring-primary/15 md:text-sm"
                  />
                </div>
              )}

              <fieldset>
                <legend className="text-sm font-medium text-fg">{t("admin.roles.form.permissions")}</legend>
                <div className="mt-3 space-y-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.id} className="rounded-xl ring-1 ring-line">
                      <p className="border-b border-line bg-surface-2/60 px-4 py-2 text-xs font-semibold tracking-wide text-fg-muted uppercase">
                        {t(`admin.roles.groups.${group.id}`)}
                      </p>
                      <ul className="divide-y divide-line">
                        {group.permissions.map((permission) => {
                          const allowed = canGrant(permission);
                          const id = `permission-${permission}`;
                          return (
                            <li key={permission} className="flex items-start justify-between gap-4 px-4 py-3">
                              <div className="min-w-0">
                                <label htmlFor={id} className={cn("text-sm font-medium", allowed ? "text-fg" : "text-fg-subtle")}>
                                  {permissionLabel(permission)}
                                </label>
                                <p id={`${id}-hint`} className="mt-0.5 text-[0.8125rem] text-fg-muted">
                                  {allowed ? permissionDescription(permission) : t("admin.roles.form.cantGrant")}
                                </p>
                              </div>
                              <Switch
                                id={id}
                                checked={granted.has(permission)}
                                disabled={!allowed}
                                onCheckedChange={(on) => toggle(permission, on)}
                                aria-describedby={`${id}-hint`}
                                className="mt-0.5"
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <Dialog.Close asChild>
                <Button variant="secondary">{t("common.cancel")}</Button>
              </Dialog.Close>
              <Button type="submit" loading={saving}>
                {role ? t("admin.roles.form.save") : t("admin.roles.form.create")}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
