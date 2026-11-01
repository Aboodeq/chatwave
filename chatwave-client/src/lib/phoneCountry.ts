import type { CountryCode } from "libphonenumber-js/min";

const STORAGE_KEY = "chatwave-phone-country";

/**
 * The country for a phone number field: the last one used here, otherwise the region of the
 * browser's language. Kept apart from lib/phone.ts so pages can call it without loading the
 * phone number library (the field checks the code is supported once that loads).
 */
export function guessCountry(): CountryCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && /^[A-Z]{2}$/.test(saved)) return saved as CountryCode;
  } catch {
    // storage unavailable
  }
  const languages = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of languages) {
    try {
      const region = new Intl.Locale(language).maximize().region;
      if (region && /^[A-Z]{2}$/.test(region)) return region as CountryCode;
    } catch {
      // not a valid locale tag
    }
  }
  return "US";
}

export function rememberCountry(code: CountryCode) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // storage unavailable
  }
}
