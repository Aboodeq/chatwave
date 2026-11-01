/** The languages ChatWave speaks. Arabic is written right to left. */
export const LANGUAGES = {
  en: { name: "English", dir: "ltr" },
  ar: { name: "العربية", dir: "rtl" },
} as const;

export type Language = keyof typeof LANGUAGES;

// Keep both in step with the script in index.html.
const STORAGE_KEY = "chatwave-language";
const ACCOUNT_KEY = "chatwave-account-language";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && value in LANGUAGES;
}

/** The language someone picked on this device, if they did. */
export function savedLanguage(): Language | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isLanguage(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function rememberLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // storage unavailable
  }
}

/** The signed-in account's language, kept so the app opens in it without a flash. */
export function rememberAccountLanguage(language: Language | null) {
  try {
    if (language) localStorage.setItem(ACCOUNT_KEY, language);
    else localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // storage unavailable
  }
}

/**
 * The choice made on this device; otherwise the signed-in account's language; otherwise
 * Arabic if the browser prefers it; otherwise English.
 */
export function detectLanguage(): Language {
  const saved = savedLanguage();
  if (saved) return saved;
  try {
    const account = localStorage.getItem(ACCOUNT_KEY);
    if (isLanguage(account)) return account;
  } catch {
    // storage unavailable
  }
  const preferred = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  return preferred[0]?.toLowerCase().startsWith("ar") ? "ar" : "en";
}
