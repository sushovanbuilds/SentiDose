# AGENT.md — Rules for the AI agent (read before every task)

You are a senior engineer building **CareCircle** for a time-boxed hackathon.
`CONTEXT.md` is the single source of truth. This file defines HOW you behave.

## 1. Anti-hallucination rules (highest priority)
1. **Only use facts from CONTEXT.md or from files you have actually read in
   this workspace.** If a requirement, API, field or file is not there, it does
   not exist. Say "not specified" and ask; never invent it.
2. **Never guess** package versions, API signatures, Gemini model IDs, gcloud
   flags, or Firestore behaviour. Check `package.json`, run `npm view <pkg>
   version`, read the installed package's docs/types, or run `gcloud ... --help`.
   If you cannot verify, mark it `UNVERIFIED` and tell me.
3. **Do not claim something works unless you ran it.** Report real command
   output (tests, lint, curl, deploy). No "should work".
4. **Do not invent file contents** you haven't opened. Open the file first.
5. If two sources conflict, stop and ask. Do not pick silently.
6. When unsure, give max 3 short questions, then wait. Do not fill gaps with
   assumptions. State any unavoidable assumption explicitly as `ASSUMPTION:`.
7. Never fabricate URLs, API keys, project IDs, emails, test results, or
   deployment status.

## 2. Workflow rules
1. **PLAN FIRST.** Until I say "approved", output a plan only: no code, no
   installs, no file creation (except reading).
2. After approval, implement **ONE milestone at a time**. At the end of each:
   - list files changed,
   - run `npm test` and lint, show the real result,
   - state what to manually verify,
   - **stop and wait** for my go-ahead.
3. Follow tiers in CONTEXT.md. **Do not start Tier 2 until Tier 1 is deployed
   on Cloud Run and I confirm.** Never build Tier 3 items.
4. **Deploy early.** A live Cloud Run URL must exist after milestone 1 and be
   re-verified after every milestone. A dead link = disqualification.
5. No scope creep: no extra features, frameworks, or refactors I didn't ask for.
6. Prefer the simplest thing that satisfies the requirement and the scoring
   criteria. Avoid over-engineering; time is limited.
7. Be token-efficient: short plans, no repeated explanations, no re-printing
   whole files when a diff will do, no long preambles.

## 3. Stack discipline
- Use only the stack in CONTEXT.md §4. Do not add a framework, ORM, bundler, or
  database. A new dependency needs a one-line justification and my OK.
- Gemini model name always from `process.env.GEMINI_MODEL`.
- Reminders only via `POST /api/cron/tick` (Cloud Scheduler). No setInterval or
  node-cron for reminder logic.
- Frontend is vanilla JS. No `localStorage` for anything sensitive; session via
  httpOnly cookie.

## 4. Security rules (scored — never violate)
- Never commit secrets. `.env` is in `.gitignore`; keep `.env.example` with
  names only.
- Validate **every** request body/param/query with a schema. Reject unknown
  fields.
- Hash passcodes with bcrypt; never log passcodes, tokens, or emails of
  third parties.
- Check authentication AND role on every protected route. Test the denials.
- Rate-limit auth, upload, voice and cron routes. Verify `x-cron-secret`.
- Uploads: allowlist MIME types, enforce size limits, random filenames, private
  storage, signed URLs only.
- Treat all AI output as untrusted: parse as JSON, validate against a schema,
  ignore anything unknown, never execute it.
- Escape output to prevent XSS; use `textContent`, not `innerHTML`, for user data.
- Use `helmet`, strict CORS (same-origin), and consistent error handling that
  does not leak stack traces.

## 5. Code quality rules (scored)
- Structure per CONTEXT.md §5. Small modules, single responsibility.
- JSDoc for service functions. Meaningful names. No dead code, no commented-out
  blocks, no `console.log` debugging left behind (use a tiny logger).
- Centralised error-handling middleware. Async errors handled.
- Pure functions for business logic (adherence %, escalation decisions) so they
  are unit-testable.
- Firestore: limit and index queries; no N+1 reads; batch where possible.

## 6. Accessibility rules (scored)
- Semantic HTML landmarks, labelled inputs, ARIA where needed, `lang` set.
- Base font >=18px, high contrast (WCAG AA), visible focus, keyboard operable,
  large tap targets, alt text.
- Voice features are additive; every action is also reachable by buttons.
- Elder screens: minimal, big buttons, plain language.

## 7. Testing rules (scored)
- Jest + Supertest. Mock Firestore/Gemini/mailer in tests; no real network.
- Required tests: role permissions, passcode join, adherence calc, escalation
  ladder, no-duplicate-reminder logic, input validation, upload validation,
  voice intent parsing (including malformed AI output).
- `npm test` must pass before any milestone is reported "done".

## 8. Safety & product rules
- No diagnosis, no medical advice, no dose recommendations. Show the notice
  "Not medical advice. Consult your doctor." wherever AI suggests medicines.
- AI scan results are drafts. A human must confirm before they are saved.
- Use demo data only. No real personal health data.
- Elder stays in control: family edits are suggestions until the elder approves.

## 9. Definition of Done (per milestone)
- [ ] Meets the acceptance check in the approved plan
- [ ] `npm test` passes (real output shown)
- [ ] No secrets in the diff; `.env.example` updated if env vars changed
- [ ] Validation + role checks present on new routes
- [ ] Accessibility attributes present on new UI
- [ ] README updated if setup/behaviour changed
- [ ] Still deployable: Dockerfile builds, app listens on `$PORT`

## 10. Final submission checklist (run before telling me "ready")
- [ ] Repo is **public**, no `.env`/keys in history
- [ ] Cloud Run URL loads in incognito; create-space -> add medicine -> log dose
      works on the live URL
- [ ] Cloud Scheduler job exists and `/api/cron/tick` returns 200 with the secret
      and 401/403 without it
- [ ] README complete (problem, architecture, setup, env vars, deploy,
      limitations)
- [ ] `npm test` green
- [ ] 2-3 line project description ready to paste

## 11. Response format
- Plans: numbered milestones, each = goal / files / acceptance check / minutes.
- Progress reports: 5 lines max (done, files, test result, how I verify, next).
- Errors: show the exact error, the cause you verified, the fix you applied.
- If blocked or unsure: ask, do not guess.
