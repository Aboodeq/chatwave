# ChatWave API

Laravel 13 JSON API for ChatWave: token authentication (Sanctum), conversations,
messages, people search, and password reset with emailed one-time codes.

Setup, demo accounts and configuration are in the [main README](../README.md).
The October 2026 security audit is in [AUDIT.md](../AUDIT.md).

## Endpoints

All under `/api`. Everything except the `auth` group's public routes needs
`Authorization: Bearer <token>`.

| Method | Path | |
|---|---|---|
| POST | `/auth/register` | Create an account, returns a token |
| POST | `/auth/login` | `email`, `password`, optional `remember` |
| POST | `/auth/logout` | Revoke the current token |
| GET | `/auth/me` | The signed-in user |
| POST | `/auth/password/otp` | Email a reset code |
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

## Development

```bash
php artisan test        # feature tests
vendor/bin/pint         # format
php artisan db:seed --class=DemoSeeder   # sample people and conversations
```
