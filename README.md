# ChatWave

Messaging for teams: a Laravel 13 API (`chatwave-api`) and a React 19 + Vite client
(`chatwave-client`).

- English and Arabic, with the whole layout mirrored right to left in Arabic. Choose under
  Settings › Language (or the button on the sign-in pages); the choice is saved to the
  account, so emails and text messages arrive in it too.
- Sign up and sign in with an email address or a phone number (confirmed with a texted
  6-digit code), "keep me signed in", and password reset by email or text message.
- One-to-one conversations; find people by name, exact email address or full phone number.
- Message status on your own messages: one tick when sent, two gray ticks once it reaches
  the other person's app (even if they were offline when you sent it, it's delivered when
  they come back), two blue ticks once they've read it. Read receipts can be turned off.
- Replies, edits and deletes, unread counts, "Online" and "Last seen", and a phone layout.
- Contact info for each chat (select the name at the top): a larger photo, their about
  text and status, and blocking. Close a chat with the X button or Esc, and hide the chat
  list for more room.
- Settings, one page per category: Profile (photo, name, about), Account (email or phone,
  password), Privacy (read receipts, online status, blocked people), Language, Appearance
  (light, dark or device theme) and Devices (where you're signed in, with remote sign-out).
- Roles decide what everyone can do (see [Roles](#roles)), including whether they see
  message status and may turn off read receipts or hide their online status.
- An admin dashboard at `/admin`: activity charts, everyone's accounts (search, filters),
  suspending and restoring accounts, roles and permissions, signing people out everywhere,
  an audit log of admin actions, and a system health page with the production checklist.
- New messages currently arrive by polling every few seconds. Real-time delivery with
  Laravel Reverb is the top item in [AUDIT.md](AUDIT.md#recommended-next-steps-not-done).

See [AUDIT.md](AUDIT.md) for the October 2026 security audit and what changed.

## Requirements

- PHP 8.4.1 or newer, and Composer
- Node.js 22+

## Run it locally

**API** (http://127.0.0.1:8000):

```bash
cd chatwave-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

`migrate` offers to create the SQLite database the first time; answer yes. Seeding adds
sample people and conversations when `APP_ENV=local`.

Password reset emails are sent from the queue, so run a worker in a second terminal:

```bash
php artisan queue:work
```

With the default `MAIL_MAILER=log`, emails (including reset codes) are written to
`storage/logs/laravel.log` instead of being sent.

**Client** (http://localhost:5173):

```bash
cd chatwave-client
npm install
npm run dev
```

The client calls `http://127.0.0.1:8000/api` unless `VITE_API_URL` says otherwise
(see `chatwave-client/.env.example`).

### Demo accounts

Sign in as `test@example.com` with password `password`; it's the admin, so the account
menu has **Admin dashboard**. The other sample people (`maya@`, `daniel@`, `lina@`,
`sam@` and `yuki@example.com`) use the same password, so you can sign in as two people in
two browsers and chat. Omar Khalil signed up with a phone number: choose **Phone**, then
United States and `202 555 0143`.

### Roles

Everyone has exactly one role, and a role is a list of permissions:

| Permission | Allows |
|---|---|
| See message status | Ticks on your messages (sent, delivered, seen) |
| Turn off read receipts | Settings › Privacy › Send read receipts |
| Hide online status | Settings › Privacy › Show when I'm online |
| Overview, People, Moderate, Roles, Activity log, System | Each area of the admin dashboard (any one of them opens `/admin`) |

Built in: **Admin** (every permission, always; can't be changed) and **Member** (the
default for new accounts: the three messaging permissions). A sample **Moderator** role
shows a custom one. Manage them under Admin › Roles, and give someone a role from their
page in Admin › People. Changes apply right away. Nobody can give a role permissions they
don't have or change their own role, and only admins can give or take away the Admin role.

The first account is the admin: on an existing database, `php artisan migrate` makes the
oldest account an admin; on a new install, the first person to sign up becomes one. From
the command line:

```bash
php artisan chatwave:make-admin someone@example.com
```

### Text messages

Phone sign-up and phone password resets send a code by text message. In development
(`SMS_DRIVER=log`) nothing is sent: texts are written to `storage/logs/laravel.log`, and
the sign-up screen also shows the code. To send real texts, set `SMS_DRIVER=twilio` with
`TWILIO_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM`.

### Languages

The app follows the language picked on the device; otherwise the account's language;
otherwise the browser's (Arabic if it prefers Arabic, else English). The API answers in
the language the app sends (`Accept-Language`), including errors, emails and texts.

To add a language: copy `chatwave-client/src/locales/en.json` to `<code>.json` and
translate it, add it to `LANGUAGES` in `chatwave-client/src/i18n/languages.ts` (with its
direction), add `chatwave-api/lang/<code>.json` (and `lang/<code>/validation.php`), and add
the code to `SetLocale::SUPPORTED` and the profile's `locale` rule in the API.
`npm run check:locales` reports missing or mismatched translations.

## Updating an existing copy

After `git pull`, install the new packages and update the database:

```bash
cd chatwave-api && composer install && php artisan migrate
```

```bash
cd chatwave-client && npm install
```

## If `php artisan migrate` fails

- **It prints nothing, or says "database is locked":** another program has
  `database/database.sqlite` open. Stop `php artisan serve`, `php artisan queue:work` and
  `composer dev` (Ctrl+C), close database viewers (DB Browser for SQLite, TablePlus, a
  VS Code SQLite extension), then try again. If it still happens, restart the computer.
  On Windows, keep the project out of OneDrive-synced folders (such as a synced Desktop).
- Run it inside `chatwave-api`, after `composer install` has finished without errors.
- Check the PHP version with `php -v`. It must be 8.4.1 or newer.
- If `.env` uses MySQL (`DB_CONNECTION=mysql`), make sure the database server is running
  (in XAMPP or Laragon, start MySQL first) and the `DB_*` values match it.
- "Nothing to migrate" means the database is already up to date.

## Checks

```bash
cd chatwave-api && php artisan test && vendor/bin/pint --test
```

```bash
cd chatwave-client && npm run lint && npm run check:locales && npm run build
```

## Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | client | `http://127.0.0.1:8000/api` | Where the API is. |
| `CORS_ALLOWED_ORIGINS` | API | `*` | Comma-separated origins allowed to call the API. Set it to the client's origin in production. |
| `AUTH_TOKEN_LIFETIME` | API | `1440` | Minutes a sign-in token lasts. |
| `AUTH_REMEMBER_TOKEN_LIFETIME` | API | `43200` | Minutes it lasts with "Keep me signed in" (30 days). |
| `QUEUE_CONNECTION` | API | `database` | Reset emails and texts need a queue worker; `sync` sends them during the request instead. |
| `SMS_DRIVER` | API | `log` | `log` writes texts to the log (development); `twilio` sends them. |
| `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | API | | Twilio account, and the number (or messaging service SID) texts come from. |

## Deploying

- Set `APP_ENV=production`, `APP_DEBUG=false` and `CORS_ALLOWED_ORIGINS`, and serve both
  apps over HTTPS.
- Keep a queue worker running (`php artisan queue:work`).
- Run the scheduler every minute (`* * * * * php artisan schedule:run`). It prunes expired
  tokens and reset codes.

## Layout

```
chatwave-api/      Laravel API: app/Http (controllers, requests, resources),
                   app/Policies, app/Services, database/migrations, tests/Feature
chatwave-client/   React client: src/pages (sign-in, chat, admin/), src/components/
                   {ui,auth,chat,settings,admin}, src/hooks (data fetching),
                   src/stores (session, theme, outbox), src/i18n + src/locales
                   (English and Arabic)
```
