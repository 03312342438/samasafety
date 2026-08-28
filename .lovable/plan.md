## Why you're seeing this

The error text "Check that SENDGRID_API_KEY is valid and the sender address is a verified Single Sender…" is **not** proof that the API key is wrong. The send code (`src/lib/email.functions.ts`, `formatSendgridError`) returns that exact same generic sentence for **both** a `401` and a `403` response from SendGrid:

- **401** = the API key is actually invalid/revoked.
- **403** = the key is fine, but the request is forbidden — almost always because the **sender `ibrahim.ali2438@gmail.com` is not a verified Single Sender**, or the API key was created without the **"Mail Send"** permission.

Because both map to the same message, you can't tell which one it is. Given you just re-entered the key, the most likely cause is a **403 (sender not verified / key missing Mail Send scope)**, not a bad key.

## The fix

Update `formatSendgridError` in `src/lib/email.functions.ts` so it distinguishes the cases and includes SendGrid's own error detail:

- `401` → message clearly stating the **API key is invalid**.
- `403` → message clearly stating the **key is valid but the sender address isn't verified or the key lacks the "Mail Send" permission**.
- Append the actual reason text SendGrid returns (its JSON `errors[].message`) so the true cause is visible in the toast/logs.

```text
401  -> "SendGrid rejected the key (401). The SENDGRID_API_KEY is invalid or revoked. Reason: <sendgrid message>"
403  -> "SendGrid forbade the send (403). The key is valid but the sender 'ibrahim.ali2438@gmail.com' is not a verified Single Sender, or the key lacks 'Mail Send' permission. Reason: <sendgrid message>"
```

I'll apply the same change to the reminder path in `src/routes/api/public/hooks/maintenance-reminders.ts` if it has the same generic handler, so both routes report the true reason.

## What you should check on SendGrid's side
1. **Single Sender**: Settings → Sender Authentication → confirm `ibrahim.ali2438@gmail.com` shows **Verified** (a Gmail address can only be used as a Single Sender, and it must be confirmed via the email SendGrid sent).
2. **API key scope**: Settings → API Keys → the key used must have **Full Access** or at least **Mail Send** enabled.

After the code change, retry once — the new message will tell us exactly whether it's the key (401) or the sender/scope (403), and we'll act on that.