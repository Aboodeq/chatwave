import { z } from "zod";
import type { Contact } from "../../api/auth";
import type { CountryCode } from "../../lib/phone";

/** How someone identifies themselves: an email address or a phone number. */
export type ContactMethod = "email" | "phone";

export interface ContactValues {
  method: ContactMethod;
  email: string;
  /** As typed after the country code, e.g. "7 9123 4567". */
  phone: string;
  country: CountryCode;
}

// The phone number library is large, so it loads only when someone uses a phone number.
const phoneTools = () => import("../../lib/phone");

/** Zod fields for a form that takes an email address or a phone number. */
export const contactFields = {
  method: z.enum(["email", "phone"]),
  email: z.string(),
  phone: z.string(),
  country: z.custom<CountryCode>((value) => typeof value === "string" && value.length === 2),
};

/** Checks whichever of the two the person chose. Use with `.superRefine` (it's async). */
export async function checkContact(values: ContactValues, ctx: z.RefinementCtx) {
  if (values.method === "email") {
    const email = values.email.trim();
    if (!email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter your email address." });
    } else if (!z.email().safeParse(email).success) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email address." });
    }
    return;
  }
  if (!values.phone.trim()) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter your phone number." });
    return;
  }
  const { toE164, getCountry } = await phoneTools();
  if (!toE164(values.phone, values.country)) {
    const { name } = getCountry(values.country);
    ctx.addIssue({ code: "custom", path: ["phone"], message: `That doesn't look like a ${name} number. Check it and try again.` });
  }
}

/**
 * What the API expects ({ email } or { phone } in E.164 form), and how to show it in a
 * sentence like "We sent a code to …".
 */
export async function resolveContact(values: ContactValues): Promise<{ contact: Contact; display: string }> {
  if (values.method === "email") {
    const email = values.email.trim();
    return { contact: { email }, display: email };
  }
  const { toE164, formatInternational } = await phoneTools();
  const phone = toE164(values.phone, values.country) ?? values.phone;
  return { contact: { phone }, display: formatInternational(phone) };
}

const STORAGE_KEY = "chatwave-contact-method";

/** The method used last time on this device, so returning people don't have to switch. */
export function savedContactMethod(): ContactMethod {
  try {
    return localStorage.getItem(STORAGE_KEY) === "phone" ? "phone" : "email";
  } catch {
    return "email";
  }
}

export function rememberContactMethod(method: ContactMethod) {
  try {
    localStorage.setItem(STORAGE_KEY, method);
  } catch {
    // storage unavailable
  }
}
