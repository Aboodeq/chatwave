# ChatWave API

Laravel 13 JSON API for ChatWave: token authentication (Sanctum) with an email address or
a phone number, conversations, messages, people search, password reset with one-time codes
(by email or text), and an admin API.

Setup, demo accounts and configuration are in the [main README](../README.md).
The October 2026 security audit is in [AUDIT.md](../AUDIT.md).

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
| GET | `/conversations/{id}/messages` | History, newest first; pass `cursor` for older |
| POST | `/conversations/{id}/messages` | Send: `body`, optional `reply_to_id` |
| POST | `/conversations/{id}/read` | Mark everything as read |
| PUT | `/messages/{id}` | Edit your message: `body` |
| DELETE | `/messages/{id}` | Delete your message |
| PATCH | `/profile` | `name`, `status_text`, `show_online_status` |
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

### Admin

Admins only (`role: "admin"`); everyone else gets 403.

| Method | Path | |
|---|---|---|
| GET | `/admin/overview?days=7\|30\|90&timezone=` | Totals and activity per day, in the viewer's time zone |
| GET | `/admin/users` | Everyone: `search`, `status`, `role`, `method`, `sort`, `page` |
| GET | `/admin/users/{id}` | One person: counts, devices, admin history |
| POST | `/admin/users/{id}/suspension` | Suspend (optional `reason`): signs them out, refuses sign-in |
| DELETE | `/admin/users/{id}/suspension` | Restore access |
| PUT | `/admin/users/{id}/role` | `role`: `user` or `admin` |
| DELETE | `/admin/users/{id}/sessions` | Sign them out everywhere |
| GET | `/admin/activity` | The audit log of admin actions |
| GET | `/admin/system` | Configuration and health checks (no secrets) |

Admins can't act on their own account, and can't suspend another admin.

Any authenticated request marks you online; it's written at most once a minute, and you
count as online for two minutes after your last activity.

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
