import { useState, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ChevronRight, Loader2, UserRoundSearch, X } from "lucide-react";
import { createConversation } from "../../api/conversations";
import { searchUsers } from "../../api/users";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { upsertConversation } from "../../hooks/useConversations";
import { getErrorMessage } from "../../lib/errors";
import type { PublicUser } from "../../types/user";
import { Avatar } from "../ui/Avatar";
import { IconButton } from "../ui/IconButton";
import { SearchInput } from "../ui/SearchInput";
import { Skeleton } from "../ui/Skeleton";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim(), 250);
  const ready = term.length >= 2;

  const results = useQuery({
    queryKey: ["users", term],
    queryFn: ({ signal }) => searchUsers(term, signal),
    enabled: open && ready,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const close = () => {
    onOpenChange(false);
    setSearch("");
  };

  const start = useMutation({
    mutationFn: (person: PublicUser) => createConversation(person.id),
    onSuccess: (conversation) => {
      upsertConversation(queryClient, conversation);
      close();
      navigate(`/chat/${conversation.id}`);
    },
    onError: (error) => toast.error(getErrorMessage(error, "We couldn't start that conversation.")),
  });

  const people = ready ? results.data : undefined;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-[#04121a]/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-x-3 top-[10vh] z-50 mx-auto flex max-h-[80vh] max-w-md animate-pop flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop outline-none">
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div>
              <Dialog.Title className="font-display text-lg font-semibold">New chat</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-fg-muted">
                Find someone by name, or by their full email address.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <IconButton icon={X} label="Close" size="sm" className="-me-1.5" />
            </Dialog.Close>
          </div>

          <div className="px-5 pt-4 pb-3">
            <SearchInput value={search} onChange={setSearch} label="Name or email" autoFocus />
          </div>

          <div className="scrollbar-thin min-h-40 overflow-y-auto border-t border-line p-2" aria-live="polite">
            {!ready ? (
              <Hint>Type at least 2 characters to search.</Hint>
            ) : results.isPending ? (
              <ResultsSkeleton />
            ) : results.isError ? (
              <Hint>{getErrorMessage(results.error, "Search isn't working right now. Please try again.")}</Hint>
            ) : people && people.length > 0 ? (
              <ul className="space-y-0.5">
                {people.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => start.mutate(person)}
                      disabled={start.isPending}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    >
                      <Avatar name={person.name} src={person.avatar} />
                      <span className="min-w-0 flex-1">
                        <span dir="auto" className="block truncate text-sm font-medium">
                          {person.name}
                        </span>
                        <span dir="auto" className="block truncate text-xs text-fg-subtle">
                          {person.status_text}
                        </span>
                      </span>
                      {start.isPending && start.variables?.id === person.id ? (
                        <Loader2 className="size-4 animate-spin text-fg-subtle" aria-label="Opening chat" />
                      ) : (
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 rtl:rotate-180"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Hint>
                No one matches "{term}".
                <br />
                Try their full email address.
              </Hint>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <UserRoundSearch className="size-6 text-fg-subtle" aria-hidden="true" />
      <p className="mt-3 text-sm text-fg-muted">{children}</p>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <ul aria-label="Searching" className="space-y-0.5">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </li>
      ))}
    </ul>
  );
}
