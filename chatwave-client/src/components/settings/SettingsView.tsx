import { Link } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { useSignOut } from "../../hooks/useSession";
import { Button } from "../ui/Button";
import { AccountSection } from "./AccountSection";
import { AppearanceSection } from "./AppearanceSection";
import { PrivacySection } from "./PrivacySection";
import { ProfileSection } from "./ProfileSection";
import { SessionsSection } from "./SessionsSection";

export function SettingsView() {
  const signOut = useSignOut();

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 md:px-5">
        <Link
          to="/chat"
          aria-label="Back to chats"
          className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Link>
        <h1 className="ps-1 text-[0.9375rem] font-semibold md:ps-0">Settings</h1>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-10 px-4 py-8 md:px-6 lg:px-8">
          <ProfileSection />
          <PrivacySection />
          <AppearanceSection />
          <AccountSection />
          <SessionsSection />

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
            <div>
              <p className="text-sm font-medium text-fg">Sign out</p>
              <p className="mt-0.5 text-sm text-fg-muted">Sign out of ChatWave on this device.</p>
            </div>
            <Button variant="secondary" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
