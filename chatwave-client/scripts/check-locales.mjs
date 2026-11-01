// Checks that every language has the same translations as English.
// Plural keys may differ: English uses _one/_other, Arabic also _zero/_two/_few/_many.
// Run with: npm run check:locales
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../src/locales/", import.meta.url);
const PLURAL = /_(zero|one|two|few|many|other)$/;

function flatten(object, prefix = "", out = new Map()) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, path, out);
    else out.set(path, String(value));
  }
  return out;
}

const placeholders = (text) => [...text.matchAll(/\{\{\s*([\w.]+)/g)].map((match) => match[1]).sort().join(",");
const tags = (text) => [...text.matchAll(/<(\w+)>/g)].map((match) => match[1]).sort().join(",");
const base = (key) => key.replace(PLURAL, "");

const load = (file) => flatten(JSON.parse(readFileSync(new URL(file, dir), "utf8")));
const english = load("en.json");
let problems = 0;
const report = (message) => {
  problems++;
  console.error(message);
};

for (const file of readdirSync(dir).filter((name) => name.endsWith(".json") && name !== "en.json")) {
  const other = load(file);
  const englishBases = new Set([...english.keys()].map(base));
  const otherBases = new Set([...other.keys()].map(base));

  for (const key of englishBases) if (!otherBases.has(key)) report(`${file}: missing "${key}"`);
  for (const key of otherBases) if (!englishBases.has(key)) report(`${file}: "${key}" isn't in en.json`);

  for (const [key, text] of other) {
    const englishText = english.get(key) ?? english.get(`${base(key)}_other`) ?? english.get(base(key));
    if (englishText === undefined) continue;
    // A plural form may leave out the number ("يومان" = two days), so only check other keys fully.
    const expected = placeholders(englishText).split(",").filter((name) => !(PLURAL.test(key) && name === "count")).join(",");
    const actual = placeholders(text).split(",").filter((name) => !(PLURAL.test(key) && name === "count")).join(",");
    if (expected !== actual) report(`${file}: "${key}" uses {{${actual}}} but English uses {{${expected}}}`);
    if (tags(englishText) !== tags(text)) report(`${file}: "${key}" has different <tags> than English`);
  }
}

if (problems) {
  console.error(`\n${problems} problem(s) found.`);
  process.exit(1);
}
console.log("Translations match.");
