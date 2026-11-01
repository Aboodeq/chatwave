import { useState, type ReactNode } from "react";
import { AlertDialog } from "radix-ui";
import { Button } from "../ui/Button";

/**
 * Asks before an admin action. With `reasonLabel`, also asks for an optional reason, which
 * is saved in the audit log.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger = false,
  pending,
  reasonLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  pending: boolean;
  reasonLabel?: string;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason("");
        onOpenChange(next);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-[#04121a]/45 backdrop-blur-[2px]" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-pop rounded-2xl border border-line bg-surface p-6 shadow-pop outline-none">
          <AlertDialog.Title className="font-display text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</AlertDialog.Description>

          {reasonLabel && (
            <div className="mt-4 space-y-1.5">
              <label htmlFor="admin-reason" className="text-sm font-medium text-fg">
                {reasonLabel} <span className="font-normal text-fg-subtle">(optional)</span>
              </label>
              <textarea
                id="admin-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={255}
                rows={3}
                placeholder="Only admins see this."
                className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-base text-fg shadow-soft outline-none placeholder:text-fg-subtle/80 focus:border-primary focus:ring-4 focus:ring-primary/15 md:text-sm"
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <Button variant={danger ? "danger" : "primary"} loading={pending} onClick={() => onConfirm(reason)}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
