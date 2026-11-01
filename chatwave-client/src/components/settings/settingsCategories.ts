import type { ComponentType } from "react";
import { KeyRound, Languages, MonitorSmartphone, Palette, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { AccountSettings } from "./AccountSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { DevicesSettings } from "./DevicesSettings";
import { LanguageSettings } from "./LanguageSettings";
import { PrivacySettings } from "./PrivacySettings";
import { ProfileSettings } from "./ProfileSettings";

export type SettingsCategoryId = "profile" | "account" | "privacy" | "language" | "appearance" | "devices";

export interface SettingsCategory {
  /** Part of the URL (/settings/<id>), and where its title and description live in the translations. */
  id: SettingsCategoryId;
  icon: LucideIcon;
  page: ComponentType;
}

/**
 * Every settings page, in menu order. Each one has its own URL.
 * To add a category, build its page component, add it here, and add
 * "settings.categories.<id>" (title, description) to the translations.
 */
export const settingsCategories: SettingsCategory[] = [
  { id: "profile", icon: UserRound, page: ProfileSettings },
  { id: "account", icon: KeyRound, page: AccountSettings },
  { id: "privacy", icon: ShieldCheck, page: PrivacySettings },
  { id: "language", icon: Languages, page: LanguageSettings },
  { id: "appearance", icon: Palette, page: AppearanceSettings },
  { id: "devices", icon: MonitorSmartphone, page: DevicesSettings },
];

export function findSettingsCategory(id: string | undefined): SettingsCategory | undefined {
  return settingsCategories.find((category) => category.id === id);
}
