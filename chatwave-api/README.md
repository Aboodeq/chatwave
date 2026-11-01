# ChatWave API

Laravel 13 JSON API for ChatWave: token authentication (Sanctum) with an email address or
a phone number, conversations, messages, people search, password reset with one-time codes
(by email or text), and an admin API.

Setup, demo accounts, roles and configuration are in the [main README](../README.md).
The October 2026 security audit is in [AUDIT.md](../AUDIT.md).

Responses are in English or Arabic, following the request's `Accept-Language` header
(validation errors, messages, emails and texts).

## Endpoints

All under `/api`. Everything except the `auth` group's public routes needs
`Authorization: Bearer <token>`.

| Method | Path | |
|---|---|---|
| POST | `/auth/register/code` | Text a sign-up code to a `phone` |
| POST | `/auth/register` | Create an account: `name`, `password`, and `email`, or `phone` with `otp` |
| POST | `/auth/login` | `email` or `phone`, `password`, optional `remember` |
| POST | `/auth/logout` | Revoke the current token |
| GET | `/auth/me` | The signed-in user |
| POST | `/auth/password/otp` | Send a reset code to an `email` or `phone` |
| POST | `/auth/password/otp/verify` | Check a code |
| POST | `/auth/password/reset` | Set a new password with a code |
| GET | `/users?search=` | Find people by name or exact email |
| GET | `/conversations` | Your conversations, latest activity first |
| POST | `/conversations` | Start (or reopen) a chat: `user_id` |
| GET | `/conversations/{id}` | One conversation |
| DELETE | `/conversations/{id}` | Leave a group conversation |
| GET | `/conversations/{id}/messages` | History, newest first; pass `cursor` for older. Also returns `receipts` (see below) |
| POST | `/conversations/{id}/messages` | Send: `body`, optional `reply_to_id` |
| POST | `/conversations/{id}/read` | Mark as read, up to `message_id` if given (otherwise everything) |
| PUT | `/messages/{id}` | Edit your message: `body` |
| DELETE | `/messages/{id}` | Delete your message |
| PATCH | `/profile` | `name`, `status_text`, `show_online_status`, `read_receipts`, `locale` (`en` or `ar`) |
| POST | `/profile/avatar` | Upload a photo (`avatar`: JPG, PNG or WebP, up to 2 MB) |
| DELETE | `/profile/avatar` | Remove the photo |
| PUT | `/profile/password` | `current_password`, `password`; signs out other devices |
| GET | `/blocks` | People you blocked |
| POST | `/users/{id}/block` | Block someone |
| DELETE | `/users/{id}/block` | Unblock them |
| GET | `/sessions` | Devices you're signed in on |
| DELETE | `/sessions/{id}` | Sign out one device |
| DELETE | `/sessions` | Sign out every other device |
| GET | `/avatars/{file}` | Profile photos (public, used in `<img>` tags) |

Phone numbers are stored in E.164 form (`+962791234567`); the API also accepts spaces,
dashes and a leading `00`.

### Message status

Your own messages in a private chat carry `status`: `sent`, `delivered` (the other
person's app has fetched it: listing conversations or opening the chat marks everything
delivered) or `seen` (they read up to it). The message list also returns
`receipts: { delivered_up_to, read_up_to }` (message ids), so the app can update older
messages it already has. Both are `null` in group chats and for roles without
`messages.status`. `read_up_to` is `null` when either person turned off read receipts
(only possible when their role has `receipts.hide`).

### Admin

Role-based: each area needs its own permission (`App\Enums\Permission`), and any admin
permission opens the dashboard. `/auth/me` returns the user's `role` and `permissions`.

| Method | Path | Permission | |
|---|---|---|---|
| GET | `/admin/overview?days=7\|30\|90&timezone=` | `admin.overview` | Totals and activity per day, in the viewer's time zone |
| GET | `/admin/users` | `admin.people` | Everyone: `search`, `status`, `role` (a role id), `method`, `sort`, `page` |
| GET | `/admin/users/{id}` | `admin.people` | One person: counts, devices, admin history |
| POST | `/admin/users/{id}/suspension` | `admin.moderate` | Suspend (optional `reason`): signs them out, refuses sign-in |
| DELETE | `/admin/users/{id}/suspension` | `admin.moderate` | Restore access |
| DELETE | `/admin/users/{id}/sessions` | `admin.moderate` | Sign them out everywhere |
| GET | `/admin/roles` | any admin permission | Roles (with people counts) and every permission |
| POST | `/admin/roles` | `admin.roles` | Create: `name`, `description`, `permissions` |
| PUT | `/admin/roles/{id}` | `admin.roles` | Change a role (built-in roles keep their names) |
| DELETE | `/admin/roles/{id}` | `admin.roles` | Delete a custom role; its people become Members |
| PUT | `/admin/users/{id}/role` | `admin.roles` | Give someone a role: `role_id` |
| GET | `/admin/activity` | `admin.activity` | The audit log of admin actions |
| GET | `/admin/system` | `admin.system` | Configuration and health checks (no secrets) |

Nobody can act on their own account, change the role they're in, or give a role (or a
person) permissions they don't have. The Admin role always has every permission and only
admins can give or take it away; people in it can't be suspended. Only admins can act on
people who can open the dashboard.

Any authenticated request marks you online; it's written at most once a minute, and you
count as online for two minutes after your last activity. Requests sent with
`X-Background: 1` (the app checking for messages from a background tab) don't.

Blocking works both ways for messages: in a private chat where either person blocked the
other, sending returns 403, and the blocked person can't start a new chat with you. They
also stop seeing your online status and last seen. Conversations include `is_blocked`
(you blocked the other person) and `can_message`.

## Development

```bash
php artisan test        # feature tests
vendor/bin/pint         # format
php artisan db:seed --class=DemoSeeder   # sample people and conversations
php artisan chatwave:make-admin someone@example.com   # or --revoke
```
