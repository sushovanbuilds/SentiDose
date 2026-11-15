SentiDose design system
Read with CONTEXT.md and AGENT.md. This file defines how the UI looks and behaves. Reuse these tokens everywhere. Do NOT invent new colours, fonts, spacing values or component styles. If a Stitch export exists, extract its tokens into public/css/tokens.css and keep this file as the rulebook.
1. Design principles


Elder first. One clear action per screen. Big, plain, forgiving.

Calm and trustworthy. Warm clinical, like a well-run neighbourhood clinic. Not a startup landing page.

Every element has a job. No decoration, no filler stats, no repeated identical card grids.

Never colour alone. Always pair colour with an icon AND a text label.

Voice is additive. Every voice action also has a visible button.

Elder in control. Make it obvious when something needs the elder's approval and that nothing changes until they say yes.
2. Anti-"AI slop" rules (hard bans)


No purple/blue/pink gradients, glowing orbs, glassmorphism, neon, 3D blobs, aurora backgrounds, or sparkle/robot "AI" mascots.

No generic hero banners, no stock-photo faces, no emoji as icons.

No lorem ipsum. Use realistic content (see §12).

No tiny grey placeholder-only fields, no icon-only buttons without labels.

No cards-inside-cards, no more than one shadow level.

No "magic AI" wording. Say "We read this automatically. Please check it."
3. Colour tokens
Token Hex Use --bg #FAF8F4 page background --surface #FFFFFF cards, sheets --border #E5E0D8 1px borders, dividers --text #1F2933 body and headings --text-muted #52606D secondary text (AA on --bg) --primary #0F766E main actions, links, focus --primary-hover #0B5F59 hover/pressed --primary-soft #E6F2F0 selected/tint backgrounds --success #4D8B6A taken, approved --success-soft #E8F2EC success tint --warning #B7791F due soon, please check --warning-soft #FBF1DE warning tint --danger #B42318 missed, errors, destructive --danger-soft #FBEAE8 error tint --focus-ring #0F766E 3px outline, 2px offset
Contrast: all text/background pairs must be WCAG AA (4.5:1). Elder screens and the voice alarm target AAA (7:1) for main text. Verify, do not assume.
Status system (always colour + icon + label):
Status Colour Lucide icon Label Taken success check-circle-2 Taken Due soon warning clock Due soon Upcoming text-muted circle-dashed Upcoming Missed danger alert-circle Missed Pending approval warning hourglass Waiting for approval
4. Typography


Elder screens: Atkinson Hyperlegible. Caretaker/family screens: Inter. Load via Google Fonts with display=swap and a system fallback stack.

Weights: 400 body, 600 labels, 700 headings. No thin weights (<400).

Scale (rem, root 16px):
Token Elder Caretaker --fs-body 1.25rem (20px) 1rem (16px) --fs-label 1.125rem (18px) semibold 0.875rem (14px) semibold --fs-h2 1.75rem (28px) 1.5rem (24px) --fs-h1 2.25rem (36px) 2rem (32px) --fs-alarm 2.5rem (40px) n/a

Line-height 1.5 body, 1.25 headings. Max line length ~65ch.

User-controlled text size: "Text size +/-" control scales root font size (steps: 100%, 115%, 130%). Layout must not break at 130%.
5. Spacing, shape, elevation


Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64. Use only these.

Radius: --radius 16px (cards, buttons), --radius-sm 10px (chips, inputs), --radius-full for avatars/round buttons.

Elevation: ONE level only: 0 1px 2px rgba(31,41,51,0.08). Prefer 1px borders and whitespace to separate content.

Touch targets: min 56px (elder), 48px (caretaker). 12px+ gap between targets.

Layout: mobile-first, single column; at >=768px caretaker views use a max-width 960px container; elder views stay single column, max 560px.
4a. Icons


Lucide line icons only, 2px stroke, 24px default (28px in elder views).

Use inline SVG (or the lucide package); no icon fonts, no emoji.

Every icon-only control needs an aria-label. Prefer icon + visible text.

Core set: pill, clock, check-circle-2, alert-circle, calendar, stethoscope, mic, play, pause, volume-2, bell, users, lock, camera, pencil, trash-2, plus, chevron-left, help-circle, heart-handshake, shield-check, info, phone, map-pin.
6. Components
Button


Primary: filled --primary, white text, full-width on elder screens, 56px min height, 600 weight. Secondary: 2px --primary outline, transparent. Tertiary: text button with underline on hover/focus. Destructive: --danger.

States: default, hover, pressed, focus-visible (3px ring), disabled (50% opacity + aria-disabled), loading (spinner + text "Saving...").

One primary button per screen section.
Status chip: pill, --radius-full, soft background + icon + label (see §3).
Card: --surface, 1px --border, --radius, 16-24px padding, one shadow level. Never nest cards. Prefer dividers in lists over repeating cards.
List row: min 56px, 1px divider, leading icon, title (600), secondary line (muted), trailing action. Entire row focusable if it navigates.
Input: label ABOVE (never placeholder-only), 56px height, 1px border, 2px --primary border on focus, helper text below, error text with alert-circle icon in --danger. Use proper type, inputmode, autocomplete.
Segmented control / time chips: 56px height, selected = --primary-soft background + 2px --primary border + check icon.
Passcode input: six separated 56x64px boxes, inputmode="numeric", autocomplete="one-time-code", plus on-screen keypad with 64px keys.
Bottom nav (elder): 3 labelled items max (Today, Medicines, Family). Caretaker: 4 (Overview, Medicines, Appointments, Family). Icon + text label, active item has --primary colour + 3px top indicator.
Audio player (voice message): play/pause 64px round button, simple teal waveform (CSS/SVG, not an image), elapsed/total time, aria-labels, captions text "Message from Rahul".
Bottom sheet / modal: focus trap, Esc closes, labelled title, returns focus on close, no more than one open at a time.
Toast: bottom, role="status", 5s auto-dismiss for success, errors stay until dismissed. Never the only place an error is shown.
Empty state: icon, one plain sentence, up to two action buttons.
7. Screens (build order = priority)


Today (elder home) — MUST

Voice alarm (full screen) — MUST

Caretaker dashboard — MUST

Join care space (passcode)

Medicines list

Add/Edit medicine (+ family voice recorder)

Prescription scan review

Appointments (+ add sheet)

Approval inbox
Navigation rules: elder sees Today / Medicines / Family. Family role sees suggest-only controls ("Suggest change", never "Save") and a "Needs Dadu's approval" note.
8. Screen rules


Today: greeting + date, ONE "Next medicine" card, "I took it" (success colour allowed for this single confirm action), "Remind me in 10 minutes", "Hear message from <name>", large "Speak" mic, "Later today" timeline, next appointment card.

Voice alarm: calm, no red, no flashing, no countdown pressure. Volume ramps 0.2 -> 0.8 over 5s. Buttons: "I took it", "Remind me in 10 minutes", text "Skip this dose". Variant without recording: chime icon + "Gentle reminder". Footer: "Family is told if you skip."

Caretaker dashboard: alert banner only when needed; weekly adherence as ONE number plus a 7-day strip (icon + colour + label); today's doses list; appointments; pending approvals badge; floating "Add medicine".

Scan review: factual tone, banner "We read this automatically. Please check every detail before saving.", unclear fields get a warning border + icon + "Please check", footer "Not medical advice. Consult your doctor."

Approvals: before -> after diff, "Approve" / "Not now", footer "Nothing changes until you say yes."
9. Accessibility (scored — non-negotiable)


Semantic landmarks: header, nav, main, footer; one h1 per page; logical heading order; lang on <html> (switchable en/hi/bn).

Skip-to-content link. Visible :focus-visible ring on everything focusable.

All inputs labelled; errors linked with aria-describedby; aria-live regions for dose confirmations and alarms; role="alert" for errors only.

Fully keyboard operable; no keyboard traps except intentional modal traps.

Alt text on meaningful images; decorative SVGs aria-hidden="true".

Respect prefers-reduced-motion (disable waveform animation and transitions) and prefers-contrast. Support up to 200% zoom without horizontal scroll.

Voice controls: SpeechRecognition + speechSynthesis are optional; feature- detect and hide the mic button with a clear fallback message if unsupported.

Audio never autoplays without a user gesture; show an "Enable voice alarms" button first.

Do not communicate status by colour alone (see §3).
10. Motion


150-200ms ease-out for state changes only (focus, press, sheet open).

No parallax, bouncing or looping decorative animation. Waveform animates only while audio plays and stops under reduced motion.
11. Content and tone


Plain language, short sentences, active voice, grade-6 reading level.

Buttons are verbs: "I took it", "Remind me in 10 minutes", "Save medicine", "Approve", "Not now".

Be kind about errors: "That code didn't work. Check it and try again."

Required disclaimer wherever AI drafts medicine data: "Not medical advice. Consult your doctor."

Dates/times: "Thu 19 Nov, 11:30 AM" (12-hour, local time).
12. Demo/seed content (use these, never lorem ipsum)


Elder: Subrata Halder, "Dadu". Family: Rahul (grandson), Priya (daughter). Caretaker: Meena.

Medicines: Metformin 500 mg (9:00 AM & 9:00 PM, after food); Amlodipine 5 mg (9:00 PM); Telmisartan 40 mg (8:00 AM); Vitamin D3 (Sunday 2:00 PM).

Appointments: Dr. Banerjee, Cardiology, Thu 11:30 AM (City Clinic); Dr. Sen, Eye check-up, Tue 4:00 PM.
13. Implementation rules (vanilla stack)


Tokens live in public/css/tokens.css as CSS custom properties; components in public/css/components.css; page CSS only for layout. No inline styles.

Plain HTML/CSS/JS, no CSS framework, no build step. Lucide as inline SVG.

Build mobile-first with min-width media queries (768px, 1024px).

Elder pages add class="elder" on <body> to switch to the elder type scale and 56px targets.

Keep CSS small and reusable (BEM-ish class names). No !important.

Images/audio: lazy-load, set dimensions to avoid layout shift.
14. Design Definition of Done (per screen)


[ ] Uses only tokens from this file (no stray hex, px or fonts)

[ ] Status shown with colour + icon + text

[ ] Touch targets >= 56px (elder) / 48px (caretaker)

[ ] Keyboard-only walkthrough works; focus ring visible

[ ] Verified at 130% text size and 320px width: no overflow

[ ] Contrast checked (AA, AAA on elder/alarm)

[ ] Empty, loading, error and success states exist

[ ] Real content, plain language, no banned "AI slop" elements

[ ] prefers-reduced-motion honoured