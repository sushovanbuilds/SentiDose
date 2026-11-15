# CONTEXT.md — SentiDose (single source of truth)

> Read this file fully before planning or coding. If something is not written
> here, it is NOT a requirement and NOT a fact. Do not invent it. Ask instead.

## 1. Event facts (from the official deck)
- Event: **PromptWars x Catalyst** (Google for Developers, H2S, Build with AI).
- Format: prompt-based hackathon. Building by prompting AI (Antigravity).
- Challenge: **Elderly Care & Medication Management Platform**.
- Deadline: **submission before 4:30 today**. Time left is given by the user in
  the prompt as `[X hours]`. If missing, ask once.
- Submission requires ALL of:
  1. Public GitHub repository link (must be published and public).
  2. Deployed project link (**Google Cloud Run**). If the link is dead the team
     is DISQUALIFIED, even if ranked top 10.
  3. Brief project description.
- Scored submissions: max **2**. Only the **last** one counts.
- Automatic platform scoring checks: **code quality, security, efficiency,
  testing, accessibility, problem-statement alignment, Google services usage**.

## 2. The challenge (official wording, summarised)
Build a smart, interconnected platform that helps elderly people manage daily
medications, medical appointments and healthcare routines while keeping family
and caretakers informed.
- Shared ecosystem: elder + caretakers + family access one healthcare profile
  through **secure, passcode-based access**.
- Authorized members can **view, add, edit, manage** medication schedules,
  **track adherence**, **monitor doctor appointments**.
- System **proactively sends email reminders**: missed medications, upcoming
  doses, appointments.
- Must **go beyond a basic reminder app**: smarter, more accessible, reliable,
  collaborative, with the **elder at the centre of their own healthcare
  decisions**.

## 3. Product: SentiDose
Pitch: "Elder-first care the whole family runs together. A familiar family
voice instead of a harsh alarm, Gemini-powered scanning, and the elder always
in control."

### Roles
| Role | Can do |
|---|---|
| elder (owner) | everything; approves/rejects family suggestions; controls sharing |
| caretaker | view + add/edit/delete medicines, doses, appointments |
| family | view; suggest edits (pending until elder approves) |

### Features (priority tiers)
**TIER 1 — CORE (must be deployed first)**
1. Care Space creation; passcode join (bcrypt-hashed 6-digit code per role).
2. Medicines CRUD (name, dose, times[], with/without food, stock count).
3. Dose logging (Taken / Skip), adherence % (daily/weekly), 7-day heatmap.
4. Appointments CRUD (doctor, datetime, notes).
5. Email reminders: upcoming dose; missed dose with escalation; appointments
   (day-before and 2h-before). No duplicate sends (use a `sentAt` flag).
6. Approval flow: family edits become pending suggestions; elder approves.
7. Audit log of every change.

**Escalation ladder (exact):** dose due -> remind elder; +30 min unmarked ->
email primary caretaker; 2 missed doses in a day -> email all family.

**TIER 2 — WOW (only after Tier 1 is live on Cloud Run and submitted once)**
8. Gemini prescription scan: image -> drafted medicines as JSON -> human
   confirms before saving. Show "not medical advice, consult your doctor".
9. Voice commands (elder): Web Speech API (en-IN, hi-IN, bn-IN) -> transcript
   -> Gemini returns JSON intent {take|skip|next_medicine|next_appointment|
   unknown, medicine?} -> perform action -> reply with speechSynthesis.
10. Family Voice Alarm: family records a <=20s clip per medicine; elder app
    plays it softly (volume ramps 0.2 -> 0.8 over 5s) instead of a harsh alarm;
    fallback = soft chime + speechSynthesis; reminder email includes a
    "Play message from <name>" link.

**TIER 3 — DROPPED (do NOT build):** weekly AI digest, drug-interaction
checker, refill predictor, multi-language UI beyond voice, native mobile app,
payments, user-to-user chat.

## 4. Tech stack (fixed — do not swap)
- Runtime: Node.js (LTS) + Express. Frontend: vanilla HTML/CSS/JS served by
  Express (no heavy framework, no build step).
- Data: **Firestore** (server-side access only). Files: **Cloud Storage**.
- AI: **Gemini API** via official `@google/genai` SDK. Model name comes from
  env `GEMINI_MODEL` (never hardcode; do not guess model IDs).
- Scheduling: **Cloud Scheduler** calls `POST /api/cron/tick` every minute with
  header `x-cron-secret: $CRON_SECRET`. (Cloud Run scales to zero, so do NOT
  rely on setInterval/node-cron for reminders.)
- Secrets: env vars / **Secret Manager**. Never in code or git.
- Email: Nodemailer (SMTP, Gmail app password or similar via env vars).
- Tests: Jest + Supertest. Deploy: Dockerfile -> Cloud Run (listen on
  `process.env.PORT`, host `0.0.0.0`).
- Security libs: helmet, express-rate-limit, zod (or joi), bcrypt, compression.

## 5. Suggested structure
```
/ (repo root)
  src/
    server.js            # app bootstrap
    routes/              # auth, medicines, doses, appointments, voice, cron
    services/            # firestore, mailer, gemini, storage, escalation
    middleware/          # auth, roles, validate, rateLimit, errors
    utils/
  public/                # html, css, js, assets
  tests/
  Dockerfile  .dockerignore  .gitignore  .env.example
  README.md  CONTEXT.md  AGENT.md
```

## 6. Firestore model (draft — refine in plan, keep it small)
- `careSpaces/{spaceId}`: elderName, elderEmail, createdAt, passcodeHashes
  {caretaker, family}, elderPinHash
- `careSpaces/{id}/members/{memberId}`: name, email, role, createdAt
- `careSpaces/{id}/medicines/{medId}`: name, dose, times[], withFood, stock,
  voiceClipPath?, createdBy
- `careSpaces/{id}/doseLogs/{logId}`: medId, scheduledFor, status
  (pending|taken|skipped|missed), actedAt, remindedAt, escalatedAt
- `careSpaces/{id}/appointments/{apptId}`: doctor, datetime, notes,
  remindedDayBefore, remindedTwoHours
- `careSpaces/{id}/suggestions/{sId}`: type, payload, status
  (pending|approved|rejected), proposedBy
- `careSpaces/{id}/auditLog/{logId}`: actor, action, target, at

## 7. Non-functional requirements (these are scored)
- **Security:** helmet, rate limiting, input validation on every endpoint,
  hashed passcodes, signed httpOnly session cookie/JWT, role checks on every
  route, upload MIME + size limits (audio <=1 MB, images <=5 MB), random file
  names, no public buckets (signed URLs), no secrets in repo, CRON_SECRET check.
- **Accessibility:** semantic HTML, ARIA labels, >=18px base font, high
  contrast, keyboard navigable, big tap targets, `lang` attribute, alt text,
  visible focus. Voice is an ADDITION; buttons must always work.
- **Efficiency:** indexed/limited Firestore queries, no N+1 reads, gzip.
- **Testing:** `npm test` passes. Cover: roles/permissions, adherence
  calculation, escalation logic, validation, intent parsing, upload validation.
- **Code quality:** small modules, JSDoc on services, consistent naming, no
  dead code, lint-clean.
- **Docs:** README with problem, architecture, setup, env vars, deploy steps,
  honest limitations (e.g. browser autoplay needs a user gesture).

## 8. Environment variables (names only)
`PORT, NODE_ENV, SESSION_SECRET, CRON_SECRET, GOOGLE_CLOUD_PROJECT,
GCS_BUCKET, GEMINI_API_KEY, GEMINI_MODEL, SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASS, MAIL_FROM, APP_BASE_URL`

## 9. Known risks (plan must address)
- Browser autoplay blocked without a user gesture -> "Enable voice alarms"
  button + email fallback.
- Cloud Run scale-to-zero -> reminders via Cloud Scheduler only.
- Email deliverability -> use a verified sender/app password; log send results.
- Web Speech API unsupported in some browsers -> buttons remain primary.
- Gemini JSON may be malformed -> schema-validate, never trust raw output.
- Time pressure -> deploy early, submit a safe version, then improve.

## 10. Out of scope / non-claims
- No diagnosis, no medical advice, no dosage recommendations by AI.
- No real patient data. Use demo data only.
