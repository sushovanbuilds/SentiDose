# CareCircle

Elder-first care the whole family runs together. One shared medication routine,
a familiar family voice instead of a harsh alarm, and the elder always in control.

Built for the **PromptWars x Catalyst** hackathon (Elderly Care & Medication
Management Platform).

> Not medical advice. Demo data only. Consult your doctor.

## The problem

An elderly parent manages several medicines a day across family members who each
hold part of the picture. Reminder apps buzz at the wrong time, caretakers cannot
see what actually happened, and the person taking the medicine has the least
control over their own schedule.

CareCircle gives one shared care space: the elder sees one clear dose at a time,
the family sees the whole week, and nothing changes without the elder's approval.

## What it does

| Feature | Who |
|---|---|
| Care space with per-role 6-digit passcodes | everyone |
| Medicines: name, dose, times, with/without food, stock | elder, caretaker |
| Dose logging (taken / skipped) and adherence % with a 7-day strip | elder, caretaker |
| Appointments: doctor, specialty, time, location, notes | elder, caretaker |
| Email reminders: upcoming dose, missed dose, appointments | automatic |
| Escalation: dose due → +30 min → caretaker → 2 missed in a day → all family | automatic |
| Family suggestions, approved or declined by the elder | elder decides |
| Audit log of every change | elder, caretaker |

## Architecture

```
browser (vanilla HTML/CSS/JS)
      │  JSON over HTTPS, httpOnly signed session cookie
      ▼
Express 5 on Cloud Run ──► Firestore (all data)
      │                ──► Cloud Storage (voice clips, prescription images)
      │                ──► Gemini API (prescription scan, voice intent)
      │                ──► SMTP (reminder and escalation email)
      ▲
Cloud Scheduler ── POST /api/cron/tick every minute (x-cron-secret)
```

Cloud Run scales to zero, so reminders are driven by Cloud Scheduler only. There
is no `setInterval` or node-cron anywhere in the codebase.

```
src/
  server.js              app bootstrap, security headers, static hosting
  config.js              env validation, fails fast on a missing secret
  routes/                one module per resource
  services/              firestore, mailer, gemini, storage, escalation, adherence
  middleware/            auth, roles, validate, rateLimit, error
  utils/                 logger, time helpers, passcode hashing
public/
  css/tokens.css         design tokens (the only place colours and sizes live)
  css/components.css     button, chip, card, list, input, audio, nav, table
  css/pages.css          page layout only
  js/                    one module per page, plus the inline icon set
tests/                   jest + supertest, all external IO mocked
```

## Design

Warm clinical: warm off-white canvas, deep spruce teal for action, sage for
confirmed, ochre for "needs a look", brick for missed. Atkinson Hyperlegible on
elder screens, Inter on caretaker screens. Atkinson's letterforms separate
look-alike glyphs (0/O, 1/l/I) for low-vision readers.

Every status is colour **plus** icon **plus** a word, so colour is never the only
signal. Elder targets are 56px, caretaker 48px.

Accessibility: semantic landmarks, one `h1` per page, skip link, visible focus
rings, `aria-live` for dose confirmations, `prefers-reduced-motion` honoured,
no horizontal scroll at 320px or 130% text size.

## Environment variables

| Name | Required | Where | Purpose |
|---|---|---|---|
| `PORT` | no (default 8080) | env | HTTP port |
| `NODE_ENV` | no | env | `production` turns on HTTPS upgrade and caching |
| `SESSION_SECRET` | **yes** | Secret Manager | signs the session cookie |
| `CRON_SECRET` | **yes** | Secret Manager | authenticates the scheduler call |
| `GOOGLE_CLOUD_PROJECT` | **yes** | env | Firestore and Storage project |
| `GCS_BUCKET` | no | env | voice clips and prescription images |
| `GEMINI_API_KEY` | no | Secret Manager | prescription scan and voice intent |
| `GEMINI_MODEL` | no | env | model name from AI Studio |
| `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM` | no | env | mail transport |
| `SMTP_USER`, `SMTP_PASS` | no | Secret Manager | mail credentials |
| `APP_BASE_URL` | no | env | links inside reminder emails |

Required variables are checked at boot. A missing one stops the container, so a
misconfigured revision never serves traffic.

## Run locally

```bash
npm ci
cp .env.example .env      # fill in values
export $(grep -v '^#' .env | xargs)
npm test
npm start                 # http://localhost:8080
```

## Deploy to Cloud Run

```bash
gcloud config set project PROJECT_ID
gcloud services enable run.googleapis.com firestore.googleapis.com \
  storage.googleapis.com cloudscheduler.googleapis.com \
  secretmanager.googleapis.com generativelanguage.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com

gcloud firestore databases create --location=asia-south1
gcloud storage buckets create gs://GCS_BUCKET --location=asia-south1 \
  --uniform-bucket-level-access

printf '%s' "$VALUE" | gcloud secrets create SESSION_SECRET --data-file=-
printf '%s' "$VALUE" | gcloud secrets create CRON_SECRET --data-file=-

gcloud run deploy carecircle --source . --region=asia-south1 \
  --allow-unauthenticated --port=8080 \
  --set-env-vars=NODE_ENV=production,GOOGLE_CLOUD_PROJECT=PROJECT_ID,GCS_BUCKET=GCS_BUCKET,APP_BASE_URL=URL,SMTP_HOST=HOST,SMTP_PORT=587,MAIL_FROM=FROM,GEMINI_MODEL=MODEL \
  --set-secrets=SESSION_SECRET=SESSION_SECRET:latest,CRON_SECRET=CRON_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest

gcloud scheduler jobs create http carecircle-tick --location=asia-south1 \
  --schedule="* * * * *" --uri="URL/api/cron/tick" --http-method=POST \
  --headers="x-cron-secret=CRON_SECRET,Content-Type=application/json"
```

Builds run on Cloud Build with the pinned `node:24-alpine` base image; no local
Docker is needed.

## Tests

```bash
npm test
```

Jest + Supertest. Firestore, Gemini, Storage and SMTP are mocked; no network.
Covered: role permissions, passcode join, adherence calculation, the escalation
ladder, duplicate-reminder prevention, request validation, upload validation and
voice intent parsing.

## Limitations (honest)

- **Autoplay**: browsers block audio until the user interacts. The alarm screen
  asks for a tap on "Enable voice alarms" first, and always offers a visible
  button plus a soft chime fallback.
- **Web Speech API** is not available in every browser. The microphone button is
  feature-detected and hidden when missing; every action also has a button.
- **Email** needs a working SMTP account with a verified sender. Delivery is
  logged but cannot be guaranteed — treat email as a nudge, not a guarantee.
- **Gemini** output is untrusted. It is parsed, schema-validated and shown as a
  draft the human must confirm. Ambiguous fields are flagged, never guessed.
- **Reminders** are scheduled per minute by Cloud Scheduler. A dose can be up to
  one minute late relative to its wall-clock time.
- Stock counts are manual. There is no refill forecasting by design.

## Not built (deliberately out of scope)

Weekly AI digest, drug-interaction checking, refill prediction, multi-language UI
beyond voice, native apps, payments, chat. No diagnosis, no dosage advice.

## Demo data

Elder: Subrata Halder ("Dadu"). Family: Rahul (grandson), Priya (daughter).
Caretaker: Meena. Medicines: Metformin 500 mg, Amlodipine 5 mg, Telmisartan 40 mg,
Vitamin D3. Appointments: Dr. Banerjee (Cardiology), Dr. Sen (Eye check-up).
