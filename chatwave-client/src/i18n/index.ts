import i18n, { type BackendModule } from "i18next";
import { initReactI18next } from "react-i18next";
import { detectLanguage, isLanguage, LANGUAGES, type Language } from "./languages";

// Only the language in use is downloaded (each is its own small file).
const lazyFiles: BackendModule = {
  type: "backend",
  init() {},
  read(language, _namespace, callback) {
    import(`../locales/${language}.json`).then(
      (file: { default: Record<string, unknown> }) => callback(null, file.default),
      (error: Error) => callback(error, false),
    );
  },
};

/** Puts the language on <html> (lang, dir) so the whole layout mirrors for Arabic. */
function applyToDocument(language: string) {
  const code: Language = isLanguage(language) ? language : "en";
  document.documentElement.lang = code;
  document.documentElement.dir = LANGUAGES[code].dir;
}

void i18n
  .use(lazyFiles)
  .use(initReactI18next)
  .init({
    lng: detectLanguage(),
    fallbackLng: "en",
    supportedLngs: Object.keys(LANGUAGES),
    load: "languageOnly",
    interpolation: { escapeValue: false }, // React escapes already
    react: { useSuspense: true },
  });

applyToDocument(i18n.language);
i18n.on("languageChanged", applyToDocument);

/**
 * The locale for dates and numbers: the app's language, with the browser's regional
 * conventions when they match (en-GB gets 24-hour times, ar-EG Arabic-Indic digits).
 */
export function formatLocale(language: string = i18n.resolvedLanguage ?? "en"): string {
  const browser = typeof navigator === "undefined" ? "" : navigator.language;
  return browser.toLowerCase().startsWith(language) ? browser : language;
}

// "{{count, number}}" in a translation: digits as the language writes them.
const numberFormats = new Map<string, Intl.NumberFormat>();
i18n.services.formatter?.add("number", (value: unknown, language?: string) => {
  const locale = formatLocale(language);
  let format = numberFormats.get(locale);
  if (!format) {
    format = new Intl.NumberFormat(locale);
    numberFormats.set(locale, format);
  }
  return typeof value === "number" ? format.format(value) : String(value);
});

/** The current language, as one of ours. */
export function currentLanguage(): Language {
  return isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";
}

export default i18n;
