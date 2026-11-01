import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createRole,
  deleteRole,
  getActivity,
  getOverview,
  getPeople,
  getPerson,
  getRoles,
  getSystem,
  restorePerson,
  setRole,
  signOutEverywhere,
  suspendPerson,
  updateRole,
} from "../api/admin";
import i18n from "../i18n";
import { getErrorMessage } from "../lib/errors";
import { roleName } from "../lib/roles";
import type { PeopleQuery, RangeDays, RoleInput } from "../types/admin";

export const adminKeys = {
  all: ["admin"] as const,
  overview: (days: RangeDays, timezone: string) => ["admin", "overview", days, timezone] as const,
  people: (query: PeopleQuery) => ["admin", "people", query] as const,
  person: (id: number) => ["admin", "person", id] as const,
  roles: ["admin", "roles"] as const,
  activity: (page: number) => ["admin", "activity", page] as const,
  system: ["admin", "system"] as const,
};

/** The viewer's time zone, so "today" and each day's numbers match their calendar. */
export const viewerTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

// Refetching keeps the previous numbers on screen (dimmed) instead of flashing skeletons.
export function useOverview(days: RangeDays) {
  const timezone = viewerTimezone();
  return useQuery({
    queryKey: adminKeys.overview(days, timezone),
    queryFn: () => getOverview(days, timezone),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function usePeople(query: PeopleQuery) {
  return useQuery({ queryKey: adminKeys.people(query), queryFn: () => getPeople(query), placeholderData: keepPreviousData });
}

export function usePerson(id: number) {
  return useQuery({ queryKey: adminKeys.person(id), queryFn: () => getPerson(id) });
}

export function useRoles() {
  return useQuery({ queryKey: adminKeys.roles, queryFn: getRoles, staleTime: 30_000 });
}

export function useActivity(page: number) {
  return useQuery({ queryKey: adminKeys.activity(page), queryFn: () => getActivity(page), placeholderData: keepPreviousData });
}

export function useSystem() {
  return useQuery({ queryKey: adminKeys.system, queryFn: getSystem });
}

const fail = (fallback: string) => (error: unknown) => toast.error(getErrorMessage(error, fallback));

/** Suspend, restore, change role, sign out everywhere: each refreshes every admin view. */
export function usePersonActions(id: number, firstName: string) {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: adminKeys.all });
  const name = firstName;

  return {
    suspend: useMutation({
      mutationFn: (reason: string) => suspendPerson(id, reason),
      onSuccess: () => {
        refresh();
        toast.success(i18n.t("admin.person.toasts.suspended", { name }));
      },
      onError: fail(i18n.t("admin.person.toasts.suspendFailed")),
    }),
    restore: useMutation({
      mutationFn: () => restorePerson(id),
      onSuccess: () => {
        refresh();
        toast.success(i18n.t("admin.person.toasts.restored", { name }));
      },
      onError: fail(i18n.t("admin.person.toasts.restoreFailed")),
    }),
    setRole: useMutation({
      mutationFn: (roleId: number) => setRole(id, roleId),
      onSuccess: (user) => {
        refresh();
        toast.success(i18n.t("admin.person.toasts.roleChanged", { name, role: roleName(user.role) }));
      },
      onError: fail(i18n.t("admin.person.toasts.roleFailed")),
    }),
    signOut: useMutation({
      mutationFn: () => signOutEverywhere(id),
      onSuccess: () => {
        refresh();
        toast.success(i18n.t("admin.person.toasts.signedOut", { name }));
      },
      onError: fail(i18n.t("admin.person.toasts.signOutFailed")),
    }),
  };
}

/** Create, edit and delete roles. Role changes can change what people see, so refresh everything. */
export function useRoleActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.all });
    // The viewer's own permissions may have changed too.
    void queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  return {
    create: useMutation({
      mutationFn: (input: RoleInput) => createRole(input),
      onSuccess: () => {
        refresh();
        toast.success(i18n.t("admin.roles.toasts.created"));
      },
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: number; input: RoleInput }) => updateRole(id, input),
      onSuccess: () => {
        refresh();
        toast.success(i18n.t("admin.roles.toasts.saved"));
      },
    }),
    remove: useMutation({
      mutationFn: (id: number) => deleteRole(id),
      onSuccess: () => {
        refresh();
        toast.success(i18n.t("admin.roles.toasts.deleted"));
      },
      onError: fail(i18n.t("admin.roles.toasts.deleteFailed")),
    }),
  };
}
