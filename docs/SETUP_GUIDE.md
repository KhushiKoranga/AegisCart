# Setup Guide

Short version: see the main `README.md`. This file has the longer steps for the external services.

## 1. Razorpay (test mode)
1. Create a free Razorpay account and switch the dashboard to **Test Mode**.
2. Settings -> API Keys -> generate a key. Put them in `backend/.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
3. Webhook: Settings -> Webhooks -> add `https://YOUR_PUBLIC_URL/api/payments/webhook`, choose a secret, select events `payment.captured`, `payment.failed` and `order.paid`, and put the secret in `RAZORPAY_WEBHOOK_SECRET`. Your laptop is not reachable from the internet, so use a tunnel such as ngrok (`ngrok http 5000`) while testing.
4. Test cards and UPI ids are listed in Razorpay's "Test Card Details" documentation. No real money is used in test mode.
5. Without the webhook the app still works: `/payments/verify` confirms the payment right after checkout, and a background job asks Razorpay about unconfirmed payments every minute.

## 2. Email (Nodemailer)
Set `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM`. For Gmail use `smtp.gmail.com`, port `587`, and an **App Password** (needs 2-step verification), not your normal password. Leave `SMTP_HOST` empty to switch emails off.

## 3. Firebase Cloud Messaging (push)
Server side:
1. Firebase console -> create a project -> Project settings -> Service accounts -> **Generate new private key**.
2. Save the JSON file outside the repository (for example `backend/firebase-key.json`, which is already listed in the root `.gitignore`) and set `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-key.json`.

App side (this part cannot be done in Expo Go):
1. Add an Android app in the Firebase console using the package name from your Expo build, download `google-services.json`, and reference it in `mobile/app.json` as `android.googleServicesFile`.
2. Create a **development build** (`npx expo run:android` or EAS Build). Remote push does not work in Expo Go on Android.
3. On login the app sends the device FCM token to `PUT /api/profile/push-token`.

Without Firebase the app still works: notifications are saved in the database and shown in the Notifications screen.

## 4. AI Virtual Try-On (Replicate + IDM-VTON)
The real AI work is done by the open-source **IDM-VTON** model, hosted by [Replicate](https://replicate.com). Node.js does not run this model itself, so this is an external, paid-per-use service.

1. Create a Replicate account, add billing, and copy an API token: `REPLICATE_API_TOKEN`.
2. Open the IDM-VTON model page on Replicate (search "idm-vton"), open the **API** tab, and copy the **version id**: `REPLICATE_MODEL_VERSION`. Also compare the input names on that page with `backend/src/services/virtualTryOnService.js` (`human_img`, `garm_img`, `garment_des`, `category`, `crop`, `steps`). If the model author changes them, only that file needs an edit.
3. **Garment images**: each product colour needs a `garment_image_url` that is a *public* link to a clear photo of the garment on a plain background. The seed data uses placeholder pictures, which will not give a meaningful result.
4. Costs and limits: Replicate bills per prediction (compute time) and can queue or cold-start a model, so a preview may take from several seconds to a few minutes. Check the current price on the model page. Also read the model's licence: the published IDM-VTON licence is non-commercial, which is fine for a college project but not for a real shop.
5. If the two variables are empty, the rest of the app works and the try-on endpoint answers `503 TRYON_NOT_CONFIGURED` with a setup message.

To use another provider, rewrite `startTryOn` and `checkTryOn` in `virtualTryOnService.js`.

## 5. Private image storage
Uploaded photos and generated images are saved under `PRIVATE_STORAGE_DIR` (default `backend/storage/private`). They are never served as static files; they can only be downloaded through `GET /api/virtual-try-on/:id/image` after an ownership check. Only `storageService.js` touches the files, so it can be swapped for a private cloud bucket later.

**Retention policy:** an hourly job deletes uploaded photos, and previews that were not saved, after `TRYON_RETENTION_HOURS` (default 24). Saved previews stay until the customer deletes them. Deleting a preview deletes its image file immediately.
