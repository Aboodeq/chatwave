import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";
import examples from "libphonenumber-js/mobile/examples";

export type { CountryCode };

export interface Country {
  code: CountryCode;
  /** In the app's language, e.g. "Jordan" or "الأردن". */
  name: string;
  /** Also searchable, so English names work in every language. */
  englishName: string;
  /** "+962" */
  dialCode: string;
}

function regionNames(language: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([language], { type: "region" });
  } catch {
    return null;
  }
}

const lists = new Map<string, Country[]>();

/** Every country with a calling code, named and sorted in the given language. */
export function getCountryList(language = "en"): Country[] {
  let list = lists.get(language);
  if (!list) {
    const names = regionNames(language);
    const english = language === "en" ? names : regionNames("en");
    list = getCountries()
      .map((code) => ({
        code,
        name: names?.of(code) ?? code,
        englishName: english?.of(code) ?? code,
        dialCode: `+${getCountryCallingCode(code)}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, language));
    lists.set(language, list);
  }
  return list;
}

export function getCountry(code: CountryCode, language = "en"): Country {
  return getCountryList(language).find((country) => country.code === code) ?? {
    code,
    name: code,
    englishName: code,
    dialCode: `+${getCountryCallingCode(code)}`,
  };
}

/**
 * Format what the user typed the way it reads after the country code, e.g. Jordan
 * "0791234567" → "7 9123 4567" (shown next to "+962"). A local trunk prefix like that 0 is
 * dropped, but digits that belong to the number (Italy's leading 0) are kept.
 */
export function formatPhoneInput(input: string, country: CountryCode): string {
  const typer = new AsYouType(country);
  typer.input(input.replace(/[^\d]/g, ""));
  const callingCode = getCountryCallingCode(country);
  // "+962791234567": the calling code, then the number without any trunk prefix.
  const nationalNumber = (typer.getNumberValue() ?? "").slice(1 + callingCode.length);
  if (!nationalNumber) return "";
  return new AsYouType().input(`+${callingCode}${nationalNumber}`).replace(new RegExp(`^\\+${callingCode}\\s?`), "");
}

/** "+962791234567" for a valid number, otherwise null. */
export function toE164(input: string, country: CountryCode): string | null {
  const parsed = parsePhoneNumberFromString(input, country);
  return parsed?.isValid() ? parsed.number : null;
}

/** A pasted international number: its country and the rest, formatted. */
export function splitInternational(input: string): { country: CountryCode; national: string } | null {
  const parsed = parsePhoneNumberFromString(input);
  if (!parsed?.country || !parsed.isValid()) return null;
  return { country: parsed.country, national: formatPhoneInput(parsed.nationalNumber, parsed.country) };
}

/** "+962 7 9123 4567" for display. */
export function formatInternational(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

/** A realistic mobile number for the placeholder, e.g. "7 9012 3456" ("" if there's none). */
export function examplePhone(country: CountryCode): string {
  const example = getExampleNumber(country, examples);
  return example ? formatPhoneInput(example.nationalNumber, country) : "";
}

/** Typing as you go: an international number or a national one. */
export function formatInternationalAsYouType(input: string): string {
  return new AsYouType().input(input);
}
