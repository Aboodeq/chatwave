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
  name: string;
  /** "+962" */
  dialCode: string;
}

const regionNames = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

let countries: Country[] | null = null;

/** Every country with a calling code, sorted by English name. */
export function getCountryList(): Country[] {
  countries ??= getCountries()
    .map((code) => ({ code, name: regionNames?.of(code) ?? code, dialCode: `+${getCountryCallingCode(code)}` }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return countries;
}

export function getCountry(code: CountryCode): Country {
  return getCountryList().find((country) => country.code === code) ?? {
    code,
    name: code,
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

/** A realistic mobile number for the placeholder, e.g. "7 9012 3456". */
export function examplePhone(country: CountryCode): string {
  const example = getExampleNumber(country, examples);
  return example ? formatPhoneInput(example.nationalNumber, country) : "Phone number";
}

/** Typing as you go: an international number or a national one. */
export function formatInternationalAsYouType(input: string): string {
  return new AsYouType().input(input);
}
