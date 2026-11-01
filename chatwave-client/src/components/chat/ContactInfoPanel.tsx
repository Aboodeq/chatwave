import { useState, type ReactNode } from "react";
import { AlertDialog, Dialog } from "radix-ui";
import { ArrowLeft, Ban, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBlockActions } from "../../hooks/useBlocks";
import { useNow } from "../../hooks/useNow";
import { cn, formatMoment } from "../../lib/utils";
import type { Conversation } from "../../types/conversation";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";

/**
 * Details about the person in a private chat: their photo (click to see it full size),
 * whether they're online, their about text, and blocking.
 * Full screen on phones, a drawer over the chat on medium screens, a column beside it on wide ones.
 */
export function ContactInfoPanel({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const { t } = useTranslation();
  const person = conversation.participant;
  const name = conversation.name ?? person?.name ?? t("chat.info.contact");
  const firstName = name.split(" ")[0];
  const now = useNow(30_000);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const { block, unblock } = useBlockActions();

  const presence = conversation.is_online
    ? t("chat.thread.online")
    : conversation.last_seen_at
      ? formatMoment(conversation.last_seen_at, now, "lastSeen")
      : null;

  return (
    <aside
      aria-label={t("chat.info.title")}
      className={cn(
        "absolute inset-y-0 end-0 z-20 flex w-full animate-fade-in flex-col bg-surface",
        // Medium screens: a drawer over the chat. Wide screens: a column beside it.
        "md:max-w-sm md:border-s md:border-line md:shadow-[0_0_36px_rgb(15_26_34/0.16)]",
        "xl:static xl:z-auto xl:w-96 xl:max-w-none xl:shrink-0 xl:shadow-none",
      )}
    >
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-2 md:px-3">
        {/* Phones treat the panel as a screen of its own, so it gets a back arrow. */}
        <IconButton
          icon={ArrowLeft}
          label={t("chat.info.close")}
          className="md:hidden rtl:[&_svg]:rotate-180"
          onClick={onClose}
        />
        <IconButton icon={X} label={t("chat.info.close")} className="hidden md:inline-grid" onClick={onClose} />
        <h2 className="text-[0.9375rem] font-semibold">{t("chat.info.title")}</h2>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto bg-canvas">
        <section className="flex flex-col items-center bg-surface px-6 pt-8 pb-6 text-center">
          {person?.avatar ? (
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              className="rounded-full transition-opacity outline-none hover:opacity-90 focus-visible:ring-4 focus-visible:ring-ring"
            >
              <Avatar name={name} src={person.avatar} size="2xl" />
              <span className="sr-only">{t("chat.info.viewPhoto", { name })}</span>
            </button>
          ) : (
            <Avatar name={name} size="2xl" />
          )}
          <h3 dir="auto" className="mt-4 font-display text-xl font-semibold tracking-tight text-fg">
            {name}
          </h3>
          {presence && (
            <p className={cn("mt-1 text-sm", conversation.is_online ? "font-medium text-success" : "text-fg-muted")}>
              {presence}
            </p>
          )}
        </section>

        <section className="mt-2 bg-surface px-6 py-5">
          <h4 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">{t("chat.info.about")}</h4>
          <p dir="auto" className="mt-2 text-[0.9375rem] leading-relaxed text-fg">
            {person?.status_text || <span className="text-fg-subtle">{t("chat.info.nothing")}</span>}
          </p>
        </section>

        {person && (
          <section className="mt-2 bg-surface p-2">
            {conversation.is_blocked ? (
              <ActionButton
                onClick={() => unblock.mutate({ id: person.id, name: firstName })}
                disabled={unblock.isPending}
              >
                {t("chat.info.unblock", { name: firstName })}
              </ActionButton>
            ) : (
              <ActionButton onClick={() => setConfirmBlock(true)}>{t("chat.info.block", { name: firstName })}</ActionButton>
            )}
          </section>
        )}
      </div>

      {person?.avatar && (
        <PhotoViewer open={photoOpen} onOpenChange={setPhotoOpen} src={person.avatar} name={name} />
      )}

      {person && (
        <AlertDialog.Root open={confirmBlock} onOpenChange={setConfirmBlock}>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-[#04121a]/45 backdrop-blur-[2px]" />
            <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 animate-pop rounded-2xl border border-line bg-surface p-6 shadow-pop outline-none">
              <AlertDialog.Title className="font-display text-lg font-semibold">
                {t("chat.info.blockTitle", { name: firstName })}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-fg-muted">
                {t("chat.info.blockBody", { name: firstName })}
              </AlertDialog.Description>
              <div className="mt-6 flex justify-end gap-2">
                <AlertDialog.Cancel asChild>
                  <Button variant="secondary">{t("common.cancel")}</Button>
                </AlertDialog.Cancel>
                <Button
                  variant="danger"
                  loading={block.isPending}
                  onClick={() =>
                    block.mutate({ id: person.id, name: firstName }, { onSettled: () => setConfirmBlock(false) })
                  }
                >
                  {t("chat.info.blockConfirm")}
                </Button>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      )}
    </aside>
  );
}

function ActionButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-start text-[0.9375rem] font-medium text-danger transition-colors outline-none hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      <Ban className="size-5 shrink-0" aria-hidden="true" />
      {children}
    </button>
  );
}

/** Full-size profile photo. Click outside it, press Esc, or use the button to close. */
function PhotoViewer({
  open,
  onOpenChange,
  src,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  name: string;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/90" />
        <Dialog.Content
          aria-describedby={undefined}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none sm:p-10"
        >
          <Dialog.Title className="sr-only">{t("chat.info.photo", { name })}</Dialog.Title>
          <img
            src={src}
            alt={t("chat.info.photoAlt", { name })}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full w-[min(100%,32rem)] animate-pop rounded-2xl object-contain shadow-2xl"
          />
          <Dialog.Close
            aria-label={t("chat.info.closePhoto")}
            className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-5" aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
