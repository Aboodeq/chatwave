# ChatWave review: backend audit and frontend findings

October 2026. Covers `chatwave-api` (Laravel 13) and `chatwave-client` (React 19).

## Summary

Every file in both projects was read. Each backend issue below was first reproduced
with an automated test against the original code, then fixed, and the test was kept as
a regression test. The API test suite grew from 4 tests to 49.

| | Found | Fixed | Recommended (not done) |
|---|---|---|---|
| Critical | 1 | 1 | |
| High | 6 | 6 | |
| Medium | 8 | 8 | |
| Low | 11 | 11 | |
| Missing features | | | 12 |

The most serious problems:

1. **Any signed-in user could read any private message** in the system (B1).
2. **42 published vulnerabilities in the locked dependencies**, one of them critical (B2).
3. **Signing in crashed with the default configuration** (B3).
4. **No brute-force protection** on sign-in, and the reset-code guess limit could be bypassed (B4, B5).
5. **Message history silently skipped messages** (B6).
6. **The sign-in page claimed "end-to-end encryption"**, which the app does not have (F1).

Severity reflects impact if the app were deployed as-is: **Critical**, exploitable data
breach; **High**, security hole, outage or data loss; **Medium**, real but limited impact;
**Low**, hardening or hygiene.

---

## Backend findings

### Critical

#### B1. Any user could read any private message

`POST /api/conversations/{id}/messages` accepted any `reply_to_id` that existed anywhere
(`exists:messages,id`). The response embeds the replied-to message, so posting into your
own conversation with someone else's message ID returned that message's text plus its
author's email and phone number. Walking through IDs 1, 2, 3… dumped every conversation.

Reproduced: Mallory replied to message #1 from Alice and Bob's private chat and the 201
response contained `"body": "TOP SECRET between Alice and Bob"` and `"email": "alice@example.com"`.

**Fixed:** the reply target must be a live message in the same conversation
(`StoreMessageRequest`). Test: `MessageTest::test_cannot_reply_to_a_message_from_another_conversation`.

### High

#### B2. 42 known vulnerabilities in the locked dependencies

`composer.lock` pinned laravel/framework 13.9.0 and older Symfony, Guzzle and CommonMark
releases. `composer audit` listed 42 advisories (1 critical, 14 high), including:

- CVE-2026-114509 (critical): Laravel token-guard authentication bypass.
- PKSA-3r5d-mb8f-1qw9 (high): CRLF injection in Laravel's `email` validation rule, which
  this app uses on sign-up, sign-in and password reset.
- CVE-2026-45067 (high): email header / SMTP command injection in symfony/mime.
- CVE-2026-108082 (high): ReDoS in symfony/http-foundation, reachable through any
  request's `Cache-Control` header.

**Fixed:** dependencies updated within the existing version constraints (Laravel 13.39,
Sanctum 4.3.3, Reverb 1.12). `composer audit` now reports none.

#### B3. Signing in crashed with the default configuration

`AuthController::login` used `Auth::attempt()`, which starts a server-side session. The
default session driver is `database`, but the users migration had dropped Laravel's
`sessions` table, so every correct password produced HTTP 500
(`no such table: sessions`). The test suite didn't notice because it uses the `array`
session driver.

**Fixed:** credentials are checked with `Auth::validate()` (constant-time, no session),
and the missing `sessions` migration is restored.
Test: `LoginTest::test_login_works_with_the_database_session_driver`.

#### B4. No brute-force protection on sign-in or sign-up

30 wrong passwords in a row were all answered normally. Only the three password-reset
routes had any rate limit.

**Fixed:** after 5 failures an account is locked for a minute (per account and IP), sign-in
and sign-up are limited to 20 per minute per IP, and the whole API to 120 requests per
minute per user. Lockouts return 429 with the wait time.

#### B5. The reset-code guess limit could be bypassed

Each 6-digit code allowed 5 wrong guesses, but requesting a new code reset the counter, so
guesses were effectively unlimited. Separately, the counter was read, checked and then
incremented in three steps, so parallel requests could all pass the check.

**Fixed:** attempts are reserved atomically (`UPDATE … WHERE attempts < 5`); per-address
limits survive new codes (10 checks an hour, 30 a day; 1 code a minute, 5 an hour, 10 a
day); a code is consumed before the password changes, so it works exactly once.
Tests in `PasswordResetTest`.

#### B6. Message history silently skipped messages

History was cursor-paginated on `created_at`, which is not unique and has one-second
precision. Messages sharing a timestamp fell between pages: of 45 messages sent within
two seconds, only 30 were ever returned.

**Fixed:** paginate on `id`. Test: `MessageTest::test_history_pages_return_every_message_exactly_once`.

#### B7. Everyone's email address and phone number were exposed

`UserResource`, which includes email and phone, was used for message senders, reply
authors, reaction authors and conversation participants, so anyone you chatted with
received your contact details (and, with B1, anyone at all).

**Fixed:** a new `PublicUserResource` (no contact details) is used for other people.
The full resource is only returned for your own account.

### Medium

#### B8. Sign-in tokens never expired

`sanctum.expiration` was `null` and tokens had no expiry, so every sign-in created a
token valid forever. The old client's sign-out didn't revoke it either.

**Fixed:** tokens last 1 day, or 30 days with "Keep me signed in" (configurable in
`.env`), expired tokens are pruned daily, and the client revokes its token on sign-out.

#### B9. Password reset revealed which emails have accounts

The response text was the same either way, but only real accounts did a bcrypt hash, a
database write and a synchronous email send before answering, so response time gave the
answer away.

**Fixed:** the code is generated and emailed by a queued job; the endpoint answers in the
same way and time for every address. The plain code never enters the queue payload.

#### B10. Emails were case-sensitive

Emails were stored as typed. On SQLite and PostgreSQL, `Ann@x.com` and `ann@x.com` could
register as two accounts, and signing in with different capitalization failed.

**Fixed:** emails are lowercased on input and storage, with a data migration for existing
rows (accounts that differ only by case are left alone and logged for manual review).

#### B11. Leaving a private conversation stranded the other person

"Leave" removed you from a one-to-one chat, but the other person could keep sending
messages nobody would ever read, and starting a new chat created a duplicate.

**Fixed:** only group conversations can be left (private ones return 403). A proper
"delete chat for me" is listed under recommendations.

#### B12. Unauthenticated requests without `Accept: application/json` crashed

Laravel tried to redirect them to a `login` route that doesn't exist, returning 500
instead of 401. Validation errors in the same situation redirected to `/`.

**Fixed:** API routes always answer in JSON.

#### B13. Mark-as-read ran two queries per unread message

103 queries for a conversation with 50 unread messages.

**Fixed:** bulk upserts in chunks (5 queries in that case). It now also records
`last_read_at`.

#### B14. Missing indexes on SQLite and PostgreSQL

Unlike MySQL, these don't index foreign keys automatically, so loading a conversation's
messages and a user's conversations scanned whole tables. SQLite is the default database.

**Fixed:** indexes on `messages (conversation_id, id)` and
`conversation_participants (user_id, conversation_id)`.

#### B15. `composer.json` and `composer.lock` disagreed on PHP

`composer.json` allowed PHP 8.3, but the lock file contained Symfony 8 packages that need
8.4, so `composer install` failed on 8.3.

**Fixed:** `composer.json` now requires PHP ^8.4.1, matching the lock file (the patched
Symfony 8.1 releases need 8.4.1).

### Low

| | Finding | Fix |
|---|---|---|
| B16 | Sending `media_ids` made the body optional, creating empty messages; clients could label text as image/file/audio. No upload endpoint exists. | Body required; messages are text. |
| B17 | Double-clicking "start chat" could create two conversations with the same person. | Per-pair lock; existing chat returns 200, new 201. |
| B18 | 404s named internal classes (`No query results for model [App\Models\Conversation]`); non-participants got 403, confirming a conversation exists. | Generic "Not found." and 404 for non-participants. |
| B19 | Authorization was copy-pasted in each controller method; authors who had left a group could still edit and delete messages there. | `ConversationPolicy` and `MessagePolicy`, applied on the routes. |
| B20 | The API's asset build, and therefore `composer setup`, failed: `resources/js/echo.js` imported `laravel-echo`, which isn't installed there. | Removed (Echo belongs in the client). |
| B21 | Responses after sending or editing a message lazy-loaded each reaction's user (N+1). | Consistent eager loading; lazy loading now throws outside production. |
| B22 | Password rules duplicated in two places; bcrypt ignores characters after 72 bytes. | `Password::defaults()` (8–72 characters). |
| B23 | Expired reset codes were never deleted. | Prunable model, scheduled daily. |
| B24 | The reset email was plain text only. | Added an HTML version in the new brand style. |
| B25 | The code didn't match the project's own Pint formatter. | Applied in a separate commit. |
| B26 | The database seeder always inserted `test@example.com`, so `migrate --seed` crashed on a database that already had it. | Seeders can run repeatedly. |

---

## Recommended next steps (not done)

These are missing features or larger design decisions rather than bugs.

1. **Real-time messaging.** Reverb is installed and configured, but no events are
   broadcast; the client polls (4 s for the open chat, 10 s for the list). To finish it:
   broadcast message created/updated/deleted events on private per-conversation
   channels; authorize them in `routes/channels.php` (participants only); register the
   broadcasting auth route under `api` + `auth:sanctum` (it currently uses the `web`
   middleware); restrict Reverb's `allowed_origins` (currently `*`); then connect
   `laravel-echo` in the client (already a dependency) and slow polling to a fallback.
2. ~~**Presence.**~~ Done after the audit: activity is recorded (at most once a minute),
   people show as online for two minutes after their last request, signing out marks
   you offline, and a privacy setting hides it.
3. **Media in messages.** Schema and resource exist; there's no upload endpoint. (Profile
   photos are done: type and size validated, random names, SVG refused.) Validate type
   and size, store privately, serve through signed URLs.
4. **Reactions.** Schema and resource exist; there's no endpoint to add or remove one.
5. ~~**Blocking.**~~ Done after the audit, enforced by the API: in a private chat where
   either person blocked the other, neither can send; the blocked person can't start a
   new chat and no longer sees your online status or last seen. Block from a chat's
   contact info; unblock there or in Settings › Privacy.
6. **Groups.** Schema exists; there's no API to create or manage groups.
7. **Email verification** on sign-up.
8. **"Delete chat for me"** for private conversations (needs a per-participant hidden or
   cleared marker), replacing the "leave" that is now blocked (B11).
9. **Token storage.** Bearer tokens live in browser storage, so any XSS bug would expose
   them. If the client and API can share a parent domain, consider Sanctum's cookie-based
   SPA authentication; either way, serve the client with a Content-Security-Policy.
10. **Scale.** The conversation list is unpaginated, and unread counts use a correlated
    subquery per conversation. Fine today; a `last_read_message_id` watermark would scale
    better.
11. **Security logging.** Failed sign-ins, lockouts and password resets aren't logged.
12. **Production checklist.** `APP_DEBUG=false`, `CORS_ALLOWED_ORIGINS` set to the client's
    origin, a queue worker (reset emails depend on it), the scheduler cron, HTTPS.

---

## Frontend findings

All of these are addressed by the redesign.

- **F1. Claims the product doesn't back up.** The auth pages advertised "End-to-end
  encrypted messages" (messages are stored as plain text), "Available on web, iOS and
  Android" (there are no mobile apps), "Loved by 10,000+ users worldwide" with five stars,
  and "256-bit SSL" badges while the API URL was `http://`. Removed.
- **F2. Controls that did nothing.** "Keep me signed in for 30 days" wasn't sent anywhere.
  A required Terms of Service checkbox linked to no terms. The checkbox now works (B8);
  the terms checkbox is gone until there are terms.
- **F3. Session handling.** The token was stored twice. A 401 cleared one copy and
  hard-reloaded to `/login` while the router still thought the user was signed in, which
  would have looped once the chat page loaded data. Sign-out didn't revoke the token.
- **F4. Unhelpful sign-in and sign-up errors.** The sign-in form refused passwords under 8
  characters before even asking the server, every failure said "Invalid email or password"
  (even when offline or rate limited), and a failed attempt reloaded the page. Sign-up hid
  messages like "This email is already registered" behind a generic toast.
- **F5. Accessibility.** Labels weren't linked to their inputs, icon-only buttons had no
  accessible name, several controls had no visible keyboard focus, animations ignored
  "reduce motion", and placeholder text had a 2.6:1 contrast ratio.
- **F6. Hardcoded API address** (`http://127.0.0.1:8000/api`). Now `VITE_API_URL`.
- **F7. Code health.** Three pages of roughly 1,000 lines of inline styles each injected
  global CSS resets and font imports, the same canvas animation was copied three times,
  and Vite template leftovers (sample CSS, the Vite logo as favicon, unused images,
  unused stores, an empty `echo.ts`) were still in the tree.
- **F8. The chat page was a placeholder** with a heading and a logout button.

---

## How this was verified

- **API:** 49 tests, 326 assertions (previously 4). Every fixed bug has a regression test.
  `vendor/bin/pint --test` passes.
- **Client:** TypeScript, ESLint and the production build pass. Every screen was exercised
  in Chromium with Playwright: light and dark themes, phone and desktop, validation and
  server errors, the full password reset (reading the code from the mail log), replying,
  editing, deleting, starting a chat, right-to-left text, and two signed-in users
  exchanging messages (delivered in about 4 seconds by polling).
- **Caveat:** PHP 8.4 wasn't available in the review environment, so the tests ran on PHP
  8.3 against the same Laravel, Sanctum and Reverb versions as the updated lock file
  (with Symfony 7.4 instead of 8.1). Run `composer install && php artisan test` on PHP 8.4
  to confirm. The upgrade path (running the new migrations on a database created by the
  original code) was tested on SQLite and MariaDB 10.11, including rollback.
