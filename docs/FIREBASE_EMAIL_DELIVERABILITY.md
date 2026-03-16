# Make Firebase password reset emails better (and reduce spam)

Firebase sends password reset emails from Google's infrastructure. You can make them clearer, more branded, and less likely to land in spam.

## 1. Firebase Console – full template customization

1. Open [Firebase Console](https://console.firebase.google.com) → your project → **Authentication** → **Templates**.
2. Open the **Password reset** template.
3. Set these fields:

| Field | What to set | Why |
|-------|----------------|-----|
| **Sender name** | Your app/shop name (e.g. `Mistico Parfume`) | Recognizable "From" name; less likely to be treated as spam. |
| **Reply-to** | A real support/contact email | Users can reply if something goes wrong. |
| **Subject line** | Custom subject using placeholders (see below) | Clear, branded subject improves open rate and trust. |
| **Message body** | Short, friendly text with the reset link | Consistent tone and branding. |
| **Customize action URL** | Your app's login or home URL (e.g. `https://yourdomain.com/auth/login`) | Reset link points to your domain; better for trust and spam scoring. |

### Placeholders you can use

In **Subject** and **Message body** you can use:

- `%APP_NAME%` – Your app name (from Project settings).
- `%EMAIL%` – Recipient's email address.
- `%LINK%` – The password reset link (use this in the body where the button/link should go).
- `%DISPLAY_NAME%` – Recipient's display name (if set).

### Example subject

```
Reset your %APP_NAME% password
```

or:

```
Password reset for %EMAIL%
```

### Example message body

```
Hello,

You asked to reset your password for %APP_NAME%. Click the link below to choose a new password:

%LINK%

If you didn't request this, you can ignore this email. Your password won't change until you use the link above.

— The %APP_NAME% team
```

Use your own wording; keep it short and always include `%LINK%` so the user can reset their password.

## 2. Authorized domains

- In **Authentication** → **Settings** → **Authorized domains**, add every domain where the app runs (e.g. `yourdomain.com`, `refers-feeding-showing-passed.trycloudflare.com` for tunnels, `localhost` for dev).
- Missing domains can cause odd behavior and may affect how providers treat the email.

## 3. In the app

- The forgot-password success screen already tells users to **check spam/junk** if they don't see the email.
- For important flows, you can add a one-time tip (e.g. "Add us to your contacts to avoid spam") if you have a fixed sender address.

## 4. If you need maximum deliverability later

Firebase does not let you use your own SMTP for the built-in password reset. For best deliverability with your own domain and SPF/DKIM/DMARC you'd need to:

- Use Firebase Admin `generatePasswordResetLink(email)` on the backend.
- Send the email yourself via a provider (SendGrid, Postmark, etc.) with your domain and proper DNS records.

For most cases, tuning the template (sender name, subject, body, and action URL) and asking users to check spam is enough.
