import type { ComponentType } from "react";
import { KeyRound, MonitorSmartphone, Palette, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { AccountSettings } from "./AccountSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { DevicesSettings } from "./DevicesSettings";
import { PrivacySettings } from "./PrivacySettings";
import { ProfileSettings } from "./ProfileSettings";

export interface SettingsCategory {
  /** Part of the URL: /settings/<id> */
  id: string;
  title: string;
  /** One line under the title, in the menu and on the page. */
  description: string;
  icon: LucideIcon;
  page: ComponentType;
}

/**
 * Every settings page, in menu order. Each one has its own URL.
 * To add a category, build its page component and add it here.
 */
export const settingsCategories: SettingsCategory[] = [
  {
    id: "profile",
    title: "Profile",
    description: "Your name, photo and about",
    icon: UserRound,
    page: ProfileSettings,
  },
  {
    id: "account",
    title: "Account",
    description: "Email and password",
    icon: KeyRound,
    page: AccountSettings,
  },
  {
    id: "privacy",
    title: "Privacy",
    description: "Online status and blocked people",
    icon: ShieldCheck,
    page: PrivacySettings,
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Light or dark theme",
    icon: Palette,
    page: AppearanceSettings,
  },
  {
    id: "devices",
    title: "Devices",
    description: "Where you're signed in",
    icon: MonitorSmartphone,
    page: DevicesSettings,
  },
];

export function findSettingsCategory(id: string | undefined): SettingsCategory | undefined {
  return settingsCategories.find((category) => category.id === id);
}
