# ChatWave

Messaging for teams: a Laravel 13 API (`chatwave-api`) and a React 19 + Vite client
(`chatwave-client`).

- Sign up, sign in (with "keep me signed in"), and reset a forgotten password with a
  6-digit code sent by email.
- One-to-one conversations; find people by name or exact email address.
- Replies, edits and deletes, unread counts, "Online" and "Last seen", a phone layout,
  and right-to-left text.
- Settings: profile photo, name and about; password; hide your online status; light,
  dark or device theme; and the devices you're signed in on, with remote sign-out.
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

Sign in as `test@example.com` with password `password`. The other sample people
(`maya@`, `daniel@`, `lina@`, `sam@` and `yuki@example.com`) use the same password, so
you can sign in as two people in two browsers and chat.

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
cd chatwave-client && npm run lint && npm run build
```

## Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | client | `http://127.0.0.1:8000/api` | Where the API is. |
| `CORS_ALLOWED_ORIGINS` | API | `*` | Comma-separated origins allowed to call the API. Set it to the client's origin in production. |
| `AUTH_TOKEN_LIFETIME` | API | `1440` | Minutes a sign-in token lasts. |
| `AUTH_REMEMBER_TOKEN_LIFETIME` | API | `43200` | Minutes it lasts with "Keep me signed in" (30 days). |
| `QUEUE_CONNECTION` | API | `database` | Reset emails need a queue worker; `sync` sends them during the request instead. |

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
chatwave-client/   React client: src/pages, src/components/{ui,auth,chat},
                   src/hooks (data fetching), src/stores (session, theme, outbox)
```
