# Google Play Billing setup

The Android app uses package name `com.proofyourreality.record` and Google Play Billing through `@capgo/native-purchases`. Purchases are verified and acknowledged by the `verify-google-play-purchase` Supabase Edge Function; the app never grants access from a client-only receipt.

## 1. Create the payments profile

This requires the Play Console account owner or an administrator with payments permissions.

1. Open **Play Console → Setup → Payments profile** (in some accounts: **Monetize → Monetization setup**).
2. Select **Create payments profile** and enter the legal business/person name, physical address, phone number, tax information, and bank account requested by Google.
3. Accept the Google Play Developer Distribution Agreement and merchant terms.
4. Complete identity and bank verification. Subscription activation remains blocked until Google approves the profile.

Do not upload or replace app-signing certificates during this process. Billing is linked by package name and Play Console app, not by a `.der` certificate.

## 2. Create the subscription products

In **Play Console → Proof → Monetize → Products → Subscriptions**, create and activate these products. Product IDs cannot be changed after creation.

| Product ID | Name | Base plan ID | Billing period | US price | Trial |
|---|---|---|---|---:|---:|
| `proof_premium_monthly` | Proof Premium Monthly | `premium-monthly` | Monthly, auto-renewing | $7.99 | 7 days |
| `proof_premium_annual` | Proof Premium Annual | `premium-annual` | Yearly, auto-renewing | $87.00 | 7 days |

For each product:

1. Add the name and benefit description for every supported locale.
2. Add the base plan with the exact ID above, set it to auto-renew, and choose the billing period.
3. Set the US price and review/accept Play's converted regional prices.
4. Add a **new customer acquisition** offer with a 7-day free-trial phase if the trial is desired.
5. Activate the offer, base plan, and subscription. Draft products are not returned by the Billing API.

The app displays Google Play's localized `priceString`; the dollar amounts in web pricing are not used inside the Android purchase sheet.

## 3. Enable server verification

1. In Google Cloud Console, use the project linked under **Play Console → Setup → API access**.
2. Enable **Google Play Android Developer API**.
3. Create a dedicated service account and JSON key.
4. In Play Console API access, grant that account **View financial data, orders, and cancellation survey responses** and **Manage orders and subscriptions** for Proof.
5. Store the complete one-line JSON key as the Supabase secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
6. Apply migration `20260803000000_add_google_play_subscriptions.sql` and deploy `verify-google-play-purchase`.

Never commit the service-account JSON or prefix it with `VITE_`; doing so would expose merchant credentials in the app bundle.

## 4. Test before release

1. Upload a signed Android App Bundle to **Internal testing**.
2. Add tester Gmail addresses under **Setup → License testing** and to the internal-testing track.
3. Install Proof from the tester's Play Store opt-in link. Sideloaded builds generally cannot load active products.
4. Sign into a Proof account, open Pricing, verify localized prices, and complete each test subscription.
5. Confirm Account shows Premium, Restore works after reinstall, and Manage billing opens Google Play.
6. Test cancellation and renewal using Play's accelerated license-tester periods.

The uploaded build's package name and signing lineage must match the existing Play Console app. The certificate attached to this task should only be handled through Play App Signing/upload-key workflows, not billing setup.