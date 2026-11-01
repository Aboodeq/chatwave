import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { updateProfile } from "../api/profile";
import { currentLanguage } from "../i18n";
import { rememberAccountLanguage, rememberLanguage, savedLanguage, type Language } from "../i18n/languages";
import { useAuthStore } from "../stores/authStore";

function saveToAccount(language: Language) {
  updateProfile({ locale: language })
    .then((user) => useAuthStore.getState().setUser(user))
    .catch(() => {}); // the app already switched; the account catches up next time
}

/**
 * The app's language, and a way to change it. When signed in, the choice is also saved to
 * the account, so emails and text messages from ChatWave use it too.
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const signedIn = useAuthStore((s) => s.token !== null);

  const changeLanguage = useCallback(
    async (language: Language) => {
      rememberLanguage(language);
      await i18n.changeLanguage(language);
      if (signedIn) saveToAccount(language);
    },
    [i18n, signedIn],
  );

  return { language: currentLanguage(), changeLanguage };
}

/**
 * After signing in: a language picked on this device wins (and is saved to the account);
 * otherwise the app switches to the account's language, e.g. on a new device.
 */
export function useAccountLanguage() {
  const { i18n } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const accountLanguage = useAuthStore((s) => s.user?.locale);

  useEffect(() => {
    if (!userId || !accountLanguage) return;
    const chosen = savedLanguage();
    if (chosen) {
      if (chosen !== accountLanguage) saveToAccount(chosen);
      return;
    }
    rememberAccountLanguage(accountLanguage);
    if (accountLanguage !== currentLanguage()) void i18n.changeLanguage(accountLanguage);
  }, [userId, accountLanguage, i18n]);
}
