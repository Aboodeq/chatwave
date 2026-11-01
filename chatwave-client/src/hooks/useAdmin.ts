import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getActivity,
  getOverview,
  getPeople,
  getPerson,
  getSystem,
  restorePerson,
  setRole,
  signOutEverywhere,
  suspendPerson,
} from "../api/admin";
import { getErrorMessage } from "../lib/errors";
import type { PeopleQuery, RangeDays } from "../types/admin";
import type { Role } from "../types/user";

export const adminKeys = {
  all: ["admin"] as const,
  overview: (days: RangeDays, timezone: string) => ["admin", "overview", days, timezone] as const,
  people: (query: PeopleQuery) => ["admin", "people", query] as const,
  person: (id: number) => ["admin", "person", id] as const,
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

export function useActivity(page: number) {
  return useQuery({ queryKey: adminKeys.activity(page), queryFn: () => getActivity(page), placeholderData: keepPreviousData });
}

export function useSystem() {
  return useQuery({ queryKey: adminKeys.system, queryFn: getSystem });
}

/** Suspend, restore, change role, sign out everywhere: each refreshes every admin view. */
export function usePersonActions(id: number, firstName: string) {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: adminKeys.all });
  const fail = (fallback: string) => (error: unknown) => toast.error(getErrorMessage(error, fallback));

  return {
    suspend: useMutation({
      mutationFn: (reason: string) => suspendPerson(id, reason),
      onSuccess: () => {
        refresh();
        toast.success(`${firstName} is suspended and signed out everywhere`);
      },
      onError: fail("That account wasn't suspended."),
    }),
    restore: useMutation({
      mutationFn: () => restorePerson(id),
      onSuccess: () => {
        refresh();
        toast.success(`${firstName} can sign in again`);
      },
      onError: fail("That account wasn't restored."),
    }),
    setRole: useMutation({
      mutationFn: (role: Role) => setRole(id, role),
      onSuccess: (user) => {
        refresh();
        toast.success(user.role === "admin" ? `${firstName} is now an admin` : `${firstName} is no longer an admin`);
      },
      onError: fail("The role wasn't changed."),
    }),
    signOut: useMutation({
      mutationFn: () => signOutEverywhere(id),
      onSuccess: () => {
        refresh();
        toast.success(`${firstName} is signed out on every device`);
      },
      onError: fail("They weren't signed out."),
    }),
  };
}
