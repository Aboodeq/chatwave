# ChatWave client

React 19 + TypeScript + Vite single-page app for ChatWave, styled with Tailwind CSS 4.

Setup and configuration are in the [main README](../README.md).

```bash
npm install
npm run dev       # http://localhost:5173
npm run lint
npm run check:locales   # every language has every translation
npm run build
```

## Structure

- `src/pages`: sign-in, sign-up, password reset, the chat page and `admin/` (the
  dashboard); the chat and the dashboard load on demand.
- `src/components/ui`: design-system primitives (buttons, fields, OTP input, avatar…).
  Colors are semantic tokens defined in `src/index.css`, with light and dark values.
- `src/components/auth`, `src/components/chat`: page-level pieces. The sign-in pages
  share `auth/AuthLayout.tsx`: an introduction (with `ChatPreview`, a short animated
  example of message status) beside the form, which fills its own column.
- `src/i18n` and `src/locales`: translations with i18next. Only the language in use is
  downloaded. Keys are type-checked against `en.json`, plurals follow each language's
  rules (Arabic has six forms), and `lib/utils.ts` formats dates and numbers for the
  language. `<html dir>` switches to `rtl` for Arabic: layouts use logical classes (`ms-`,
  `ps-`, `start-`, `text-start`), direction-bound icons flip with `rtl:`, phone numbers,
  email addresses and codes stay left to right, and the charts mirror.
- Message status: `lib/receipts.ts` turns the API's `receipts` into each message's ticks
  (`chat/MessageStatusIcon.tsx`); `useMessages.ts` keeps them current while polling.
- `src/components/ui/PhoneField.tsx` and `src/lib/phone.ts`: phone numbers with a country
  picker, using libphonenumber-js. Both load on demand, so email sign-in stays light.
- `src/components/admin`: the dashboard's pieces, including dependency-free SVG charts
  in `admin/charts` (their colors are checked for color-blind safety and contrast).
- `src/components/settings`: one page per settings category. To add a category, build
  its page, add it to `settingsCategories.ts` and give it a title and description under
  `settings.categories` in the translations; it gets a menu entry and a URL.
- Permissions: `stores/authStore.ts` has `selectCan(permission)`; the admin dashboard
  shows only the pages the user's role allows (`pages/admin/AdminApp.tsx`).
- Signed-in URLs: `/chat/:id` (a conversation), `/chat/:id/info` (with contact info
  open) and `/settings/:category`. `src/pages/ChatPage.tsx` reads them to lay out the
  two columns; phones show one column at a time.
- `src/hooks`: data fetching with TanStack Query. `useMessages.ts` holds the message
  history, polling, optimistic sending and edit/delete logic.
- `src/stores`: session (token and user), theme and hidden chat list, and the outbox of
  messages being sent.
- `src/lib/axios.ts`: API client; a 401 on an authenticated request signs the user out.
