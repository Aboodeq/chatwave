import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { blockUser, getBlockedPeople, unblockUser } from "../api/blocks";
import i18n from "../i18n";
import { getErrorMessage } from "../lib/errors";
import { conversationKeys } from "./useConversations";

export const blockKeys = { all: ["blocks"] as const };

export function useBlockedPeople() {
  return useQuery({ queryKey: blockKeys.all, queryFn: getBlockedPeople });
}

/** Block and unblock, keeping conversations and the blocked list up to date. */
export function useBlockActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    void queryClient.invalidateQueries({ queryKey: blockKeys.all });
  };

  const block = useMutation({
    mutationFn: ({ id }: { id: number; name: string }) => blockUser(id),
    onSuccess: (_, { name }) => {
      refresh();
      toast.success(i18n.t("chat.blocks.blocked", { name }));
    },
    onError: (error) => toast.error(getErrorMessage(error, i18n.t("chat.blocks.blockFailed"))),
  });

  const unblock = useMutation({
    mutationFn: ({ id }: { id: number; name: string }) => unblockUser(id),
    onSuccess: (_, { name }) => {
      refresh();
      toast.success(i18n.t("chat.blocks.unblocked", { name }));
    },
    onError: (error) => toast.error(getErrorMessage(error, i18n.t("chat.blocks.unblockFailed"))),
  });

  return { block, unblock };
}
