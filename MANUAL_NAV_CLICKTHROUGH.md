# Manual Navigation Click-Through (5–10 min)

Use this to verify interaction-level navigation before release (actual clicks/taps, auth redirects, conditional UI).

## Preconditions

- Run app locally in browser (`npm run dev`) and open the shown URL.
- Keep devtools Console open (watch for runtime errors).
- Have one test account ready (or create one in step 6).

---

## A) Public flow checks (signed out)

### 1) Home `/`

- Click header logo **Proof** → should remain `/`.
- Click header **Pricing** → `/pricing`.
- Click header **Sign in** → `/auth`.
- Click header **Start Recording** → `/auth?mode=signup`.
- In hero, click **Start Recording** → `/auth?mode=signup`.
- In hero, click **View Sample Evidence Packet** → `/example`.
- In CTA section, click **See pricing** → `/pricing`.
- Footer/legal links:
  - Privacy → `/legal/privacy-policy.html`
  - Terms → `/legal/terms-of-service.html`
  - Cookie Notice → `/legal/cookie-notice.html`
  - Data Deletion → `/legal/data-deletion.html`

### 2) Pricing `/pricing`

- Click **Get started** on Free card → `/auth?mode=signup`.
- Click top nav **Sign in** (if visible from header state) → `/auth`.
- If you click **Start Pro/Premium** while signed out, should:
  - show sign-in-required message
  - redirect to `/auth?mode=signup`

### 3) Auth `/auth`

- Click logo **Proof** → `/`.
- Toggle mode using inline link (**Create account** / **Sign in**) and verify form mode switches.
- Legal links open correct legal pages.

### 4) Route guard quick check

- Directly visit `/dashboard` while signed out.
- Expected: redirect to `/auth`.

---

## B) Authenticated flow checks (signed in)

### 5) Sign in

- Sign in at `/auth`.
- Expected landing: `/dashboard`.

### 6) Header/AppLayout nav

- Header logo **Proof** → `/dashboard`.
- Header links:
  - **Dashboard** → `/dashboard`
  - **Pricing** → `/pricing`
  - **Account** → `/account`
- AppLayout side/mobile links:
  - Dashboard, Stress Mode, Billing, Settings all route correctly.
- Click **Sign out** (header or layout):
  - expected `/`
  - then visit `/dashboard` directly → redirected to `/auth`.

### 7) Dashboard `/dashboard`

- Click **START LIVE INCIDENT** card/button → `/stress-mode`.
- Click floating mobile **Live** button (if visible) → `/stress-mode`.
- Open **New Case** dialog:
  - open + close works
  - **Create Case** creates case and keeps you on `/dashboard`
- In Case Cards:
  - click card body → focus behavior updates right-side intelligence panel
  - click **Open case** link → `/cases/:id`

### 8) Case detail `/cases/:id`

- **All cases** back link → `/dashboard`.
- **Export Packet** → `/cases/:id/export`.
- **New Incident** → `/cases/:id/incidents/new`.
- Click an incident card (if present) → `/incidents/:incidentId`.

### 9) New incident `/cases/:id/incidents/new`

- **Back to case** and **Cancel** both return `/cases/:id`.
- **Take Photo** / **Attach Files** open pickers.
- Remove file (X) works.
- **Save Incident**:
  - success toast
  - navigates to `/incidents/:newIncidentId`

### 10) Incident detail `/incidents/:id`

- **Back to case** → `/cases/:id`.
- If not analyzed yet, **Analyze with AI** runs and remains on page with updated analysis.
- In attached evidence list:
  - **Open file** opens signed URL in new tab (when available)
  - remove icon prompts confirmation and removes item

### 11) Export preview `/cases/:id/export`

- **Back to case** → `/cases/:id`.
- **Download PDF** currently shows "coming soon" toast (no crash/no bad route).

### 12) Account `/account`

- **Save changes** works (loading state then success/error toast).
- **Manage subscription** either opens billing portal or shows clean error toast.
- **Run Analyze with AI smoke test** shows result text + toast.

### 13) Stress Mode `/stress-mode`

- **Back to Dashboard** link works.
- **START VOICE CAPTURE** toggles to stop state and back.
- Quick actions:
  - Upload Screenshot opens picker
  - Take Photo opens camera/file picker
  - Add Witness opens sheet; Save/Cancel both work
  - Quick Note opens sheet; Save/Cancel both work

---

## C) Pass/Fail summary

Mark release-nav as PASS only if all are true:

- [ ] No dead links/routes encountered
- [ ] Protected route redirects behave correctly
- [ ] Signed-in and signed-out nav states both correct
- [ ] Dialogs/drawers open/close and buttons respond
- [ ] No console runtime errors during click-through

If any fail, capture:

- page URL
- button/link label
- expected vs actual
- console error (if any)
- screenshot
