import { AlertDialog } from "radix-ui";
import { useTranslation } from "react-i18next";
import type { Message } from "../../types/message";
import { Button } from "../ui/Button";

interface DeleteMessageDialogProps {
  message: Message | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: (message: Message) => void;
}

export function DeleteMessageDialog({ message, deleting, onCancel, onConfirm }: DeleteMessageDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialog.Root open={message !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-[#04121a]/45 backdrop-blur-[2px]" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 animate-pop rounded-2xl border border-line bg-surface p-6 shadow-pop outline-none">
          <AlertDialog.Title className="font-display text-lg font-semibold">{t("chat.delete.title")}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-fg-muted">
            {t("chat.delete.body")}
          </AlertDialog.Description>

          {message?.body && (
            <p
              dir="auto"
              className="mt-4 line-clamp-3 rounded-xl border-s-[3px] border-line-strong bg-surface-2 px-3 py-2 text-sm text-fg-muted"
            >
              {message.body}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">{t("common.cancel")}</Button>
            </AlertDialog.Cancel>
            <Button variant="danger" loading={deleting} onClick={() => message && onConfirm(message)}>
              {t("common.delete")}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
