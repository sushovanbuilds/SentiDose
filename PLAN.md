# SentiDose continuation plan

Read `context.md` and `agent.md` in full before acting. They govern product scope, security, workflow, and definition of done. This file is a handoff: it records the current state and the already approved sequence. Do not treat anything marked blocked or unverified as complete.

## User decisions

- The user approved proceeding one milestone at a time.
- Submission is before 4:30 today. Recheck the remaining time in the active environment; do not assume the earlier estimate still applies.
- The user has **no Google Cloud project yet**.
- Do not include or build a demo section; the user said it is not needed.
- This handoff request authorizes documentation only. It does not authorize creating a cloud project, enabling billable services, publishing a public GitHub repository, or making other external changes.

## Actual workspace state

The previous environment had Node `v26.13.0` and npm `11.20.0`. `gcloud` and Docker were absent; the workspace was not a Git repository. No Cloud project, credentials, enabled APIs, public repository, or Cloud Run service were verified.

M1 scaffold files currently present:

```text
package.json
src/server.js
public/index.html
public/styles.css
tests/server.test.js
Dockerfile
.dockerignore
.gitignore
.env.example
README.md
```

Observed command results in the previous environment:

- `npm run lint` passed, but its script only runs `node --check src/server.js`; this is a syntax check, not a complete lint analysis.
- `npm test` failed with `sh: jest: command not found`.
- `npm view express version` failed with `ENOTFOUND registry.npmjs.org`; no dependency versions were verified and no lockfile was generated.
- `gcloud run deploy ...` failed with `zsh: command not found: gcloud`.
- `docker build ...` failed with `zsh: command not found: docker`.
- `git status` / `git diff --check` could not run because the workspace is not a Git repository.

`package.json` currently declares dependencies using the mutable npm `latest` tag. These are placeholders, not verified or reproducible dependency versions. Before installing or deploying, check each package with `npm view <package> version`, use versions that can be verified, and generate/commit the package lock. If the registry remains unreachable, report the blocker and do not claim tests or deployment succeeded.

**M1 is incomplete.** The landing page and health route have not been run because dependencies are not installed. The Docker image has not been built, the app has not been tested, and no live Cloud Run URL exists. Do not advance to M2 until M1's acceptance checks pass and a live URL is confirmed.

## Next action: environment and project prerequisites

This is a setup gate before completing M1, not permission for the agent to create cloud resources. Ask the user to create/select a Google Cloud project and enable billing, or use a project they provide. Then, in the new environment:

1. Re-read `context.md`, `agent.md`, and this file.
2. Check `node -v`, `npm -v`, npm registry access, `gcloud --version`, `gcloud auth list`, `gcloud config get-value project`, and `docker --version`. Record actual output; mark unavailable values unverified.
3. Verify `gcloud` command flags with `gcloud ... --help` before running commands. Do not invent a project ID, region, bucket, secret, email, URL, or Gemini model ID.
4. Confirm the selected project and billing state with the user before enabling APIs or creating resources. Required APIs for the planned stack include Cloud Run (`run.googleapis.com`), Firestore (`firestore.googleapis.com`), Cloud Storage (`storage.googleapis.com`), Cloud Scheduler (`cloudscheduler.googleapis.com`), Secret Manager (`secretmanager.googleapis.com`), and Gemini's Generative Language API (`generativelanguage.googleapis.com`). Source builds also require Cloud Build and Artifact Registry. Check actual enabled services before enabling anything.
5. Confirm the runtime in the active environment is a supported Node.js LTS release. Do not assume that the previous environment's Node 26 is LTS.
6. Verify dependency versions with `npm view`; resolve the `latest` placeholders, install, and create a lockfile. Do not add packages beyond the approved stack without a one-line justification and the user's OK.
7. Check whether the files are already in a Git repository in the new environment. Do not overwrite user changes. If no repository exists, preserve the files and ask before publishing a public GitHub repository; public publication is an external action.

If any prerequisite is missing, report it and stop before claiming M1 done. Continue useful local checks where possible.

## Approved milestone sequence

Implement only one milestone per approval checkpoint. After each milestone, follow `agent.md`: list files changed, run `npm test` and lint, show actual output, state manual verification steps, re-verify the live URL, and stop for the user's review. The minute estimates below are the earlier planning estimates, not guarantees; recalculate against the actual remaining deadline after setup.

| Milestone | Goal | Main files | Acceptance check | Earlier estimate |
|---|---|---|---|---:|
| M1 | Finish skeleton, resolve dependencies, test, build/deploy first Cloud Run revision early | Existing scaffold; dependency manifest/lock as needed | `npm test`, lint, Docker build, deploy, then `curl -f SERVICE_URL/health` | 35 min |
| M2 | Care Space creation/join, bcrypt passcodes, sessions, role checks | Auth routes/services/middleware, tests | `npm test` covers join and role denials; live URL rechecked | 40 min |
| M3 | Medicines, dose logs, adherence/heatmap, appointments | Routes, Firestore service, pure calculations, UI, tests | `npm test` covers CRUD, validation, adherence; live smoke test | 55 min |
| M4 | Email reminders, exact escalation ladder, Scheduler endpoint and deduplication | Cron route, mailer/escalation services, tests | `npm test` covers escalation and duplicate prevention; authorized and unauthorized cron checks; live URL rechecked | 50 min |
| M5 | Family suggestions/elder approval, audit log, required tests, complete README | Suggestion/audit modules, tests, README | `npm test`, lint, live URL and cron checks; this is the **SAFE TO SUBMIT NOW** point | 45 min |
| M6 | Gemini prescription scan, validated draft and human confirmation | Gemini/upload services, UI, tests | malformed AI output rejected; draft requires human confirmation; notice shown | 20 min |
| M7 | Voice commands with specified locales and intents | Voice route/service, UI, tests | supported and malformed intent tests; buttons work without voice | 15 min |
| M8 | Family voice alarm | Storage/mail/UI, tests | file limits/private storage verified; user-gesture/autoplay fallback checked | 15 min |
| M9 | Final polish, redeploy, submission checklist | README and affected files | all final checklist items verified against live service | 25 min |

M6–M8 are Tier 2 and must not start until Tier 1 is deployed, submitted once, and the user confirms. Never implement Tier 3. If time runs short, cut M8, then M7, then M6; preserve M1–M5 and the safe submission checkpoint.

## Definition of done and submission gate

Never claim a milestone is done without real passing `npm test` output. Do not report a live service until it has been deployed and checked. After M5, verify every item below against the actual repository, Google Cloud project, and live URL before saying ready:

- [ ] Repo is **public**, no `.env`/keys in history
- [ ] Cloud Run URL loads in incognito; create-space -> add medicine -> log dose works on the live URL
- [ ] Cloud Scheduler job exists and `/api/cron/tick` returns 200 with the secret and 401/403 without it
- [ ] README complete (problem, architecture, setup, env vars, deploy, limitations)
- [ ] `npm test` green
- [ ] 2-3 line project description ready to paste

Do not create real patient data. Keep all secrets out of source, logs, and Git history. Tier 2 AI output stays untrusted and medicine drafts require human confirmation. No diagnosis, medical advice, or AI dosage recommendations.
