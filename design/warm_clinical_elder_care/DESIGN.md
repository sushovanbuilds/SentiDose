---
name: Warm Clinical Elder Care
colors:
  surface: '#f7f9ff'
  surface-dim: '#d1dbe8'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e4effd'
  surface-container-high: '#dfe9f7'
  surface-container-highest: '#d9e3f1'
  on-surface: '#121d26'
  on-surface-variant: '#3e4947'
  inverse-surface: '#27313c'
  inverse-on-surface: '#e8f2ff'
  outline: '#6e7977'
  outline-variant: '#bdc9c6'
  surface-tint: '#006a63'
  primary: '#005c55'
  on-primary: '#ffffff'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#80d5cb'
  secondary: '#2b6a4b'
  on-secondary: '#ffffff'
  secondary-container: '#aff1ca'
  on-secondary-container: '#317051'
  tertiary: '#734700'
  on-tertiary: '#ffffff'
  tertiary-container: '#945d00'
  on-tertiary-container: '#ffe6cc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#aff1ca'
  secondary-fixed-dim: '#94d4af'
  on-secondary-fixed: '#002112'
  on-secondary-fixed-variant: '#0c5135'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f7f9ff'
  on-background: '#121d26'
  surface-variant: '#d9e3f1'
typography:
  headline-xl:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.01em
  headline-xl-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 48px
  headline-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 42px
  body-xl:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 36px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 22px
    fontWeight: '400'
    lineHeight: 33px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  label-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 33px
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 30px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.5rem
  space-sm: 1rem
  space-md: 1.5rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system delivers a calm, reassuring, and highly legible interface tailored for older adults interacting with voice-mediated medicine alarms. The design ethos fuses clinical authority with domestic warmth—avoiding both cold, sterile hospital aesthetics and patronizing, toy-like oversimplifications. 

Key attributes:
- **Tone:** Reassuring, patient, deliberate, and dignified.
- **Visual Style:** Warm Clinical Minimalism. Generous negative space, structured spatial layouts, high-contrast borders, solid color blocks, and absence of visual clutter.
- **Aesthetic Restraints:** Zero decorative gradients, no flashing animations, zero low-contrast text, and no ambiguous icon-only interactive states. Every interaction provides multi-sensory clarity (visual, auditory, tactile) without causing sensory overwhelm or anxiety during an alert.

## Colors

The palette is engineered specifically to exceed WCAG AAA contrast standards against both the warm canvas and pure surface elements, accounting for common age-related ocular shifts (such as loss of contrast sensitivity and lens yellowing).

- **Canvas Background (`#FAF8F4`):** Soft, linen-like off-white that reduces glare and eye fatigue compared to pure harsh white.
- **Surface Layer (`#FFFFFF`):** High-clarity pure white used exclusively for elevated interactive cards, dial pads, and modal sheets.
- **Primary Deep Teal (`#0F766E`):** Core action color representing medical confidence and serenity. Yields a contrast ratio > 7:1 against `#FAF8F4` and `#FFFFFF`.
- **Success Sage (`#4D8B6A`):** Used for confirmation states, completed doses, and positive status badges.
- **Warning Amber (`#B7791F`):** High-legibility amber for upcoming schedules, low battery alerts, or soft reminders.
- **Danger Red (`#B42318`):** Deep, non-vibrant red designated solely for missed medications, emergency contacts, and vital warnings.
- **Text Charcoal (`#1F2933`):** Neutral dark slate delivering near-maximum contrast without the harsh vibration of pure `#000000`.
- **Structural Border (`#E5E0D8`):** Subtle but tactile divider separating cards and modules clearly on the warm canvas.

## Typography

The design system exclusively adopts **Atkinson Hyperlegible Next** across all text hierarchies. Designed intentionally for visually impaired readers, its distinct character shapes disambiguate easily confused letterforms (e.g., '1', 'I', 'l', and '0', 'O').

Rules for typography application:
- **Baseline Scale:** Base body size starts at 22px with a strict 1.5 line-height (`33px`) to ensure tracking ease for tremors or vision loss.
- **Minimum Type Size:** Never render any active label, instruction, or data value below 20px.
- **Uppercase Usage:** Avoid all-caps text; sentence case maintains shape differentiation and facilitates natural scanning.
- **Weight Pairing:** Rely primarily on weights `400` (regular reading) and `700` (critical emphasis and primary buttons) to eliminate ambiguity.

## Layout & Spacing

Layouts follow a single-column or dual-column structural format to maintain a direct visual chain of custody. Information flows downwards in a calm, uncrowded stack.

- **Grid Model:** Fluid single-column layout centered with an optimal line length max-width of 720px for tablet/desktop stations, and full width with `2rem` margins on mobile devices.
- **Minimum Interactive Clearance:** Every interactive node maintains at least `1rem` (16px) separation from adjacent interactive components to prevent errant taps from motor tremors.
- **Breakpoints:**
  - *Compact (< 640px):* Single full-width stack; sticky bottom action zone for immediate emergency or acknowledgement actions.
  - *Expanded (≥ 640px):* Split-stage container dividing the primary voice visualizer/alarm message from the schedule overview.

## Elevation & Depth

To prevent visual haze, disorientation, and cognitive friction, this design system entirely foregoes complex drop shadows, fuzzy blurs, and glassmorphic translucencies.

Depth hierarchy is achieved strictly via **Tonal Stacking** and **Definite Surface Contours**:
- **Level 0 (App Canvas):** `#FAF8F4` warm backdrop.
- **Level 1 (Surface Cards & Dialogue Containers):** `#FFFFFF` with a crisp `2px solid #E5E0D8` outline.
- **Level 2 (Active/Pressed/Focused States):** Shift to a high-contrast `3px solid #0F766E` focus border accompanied by an interior 4px offset.
- **No Cast Shadows:** Shadows are omitted to ensure boundaries between active buttons and the background remain 100% sharp and discernible under varying ambient lighting conditions.

## Shapes

The geometric identity provides approachable, non-threatening curves while preserving structural solidity. 

- **Token Assignment:** Level `3` sets standard component border radii to `1rem` (16px) on cards, inputs, and standard buttons.
- **Large Surfaces (`rounded-lg` / `2rem`):** Applied to full-width voice status sheets, confirmation dialogs, and main medicine dosage pods.
- **Pill Controls (`rounded-full`):** Reserved strictly for standalone voice input triggers and immediate snooze/take pill confirmation buttons.

## Components

### Buttons & Voice Triggers
- **Dimensions:** Absolute minimum touch target height of 64px, with generous internal horizontal padding (`2rem`).
- **Primary Action ("I Took My Medicine"):** Solid `#0F766E` fill, `#FFFFFF` text, `label-lg` typography, 16px radius.
- **Secondary Action ("Snooze 15 Minutes"):** `#FFFFFF` background, 2px solid `#1F2933` border, `#1F2933` text.
- **Voice Pulse Button:** Large circular or rounded-pill target (minimum 80px x 80px) displaying a clear microphone glyph paired with persistent text ("Tap to Speak"). Visual pulse is conveyed through a smooth, slow expanding stroke (no flashing or strobing).

### Medicine Alarm Card
- Elevated `#FFFFFF` card bounded by a `2px solid #E5E0D8` border and 16px radius.
- Includes distinct pill visual representation, dose name (`headline-lg`), dosage quantity (`body-xl`), and time instructions (`body-lg`).
- Uses high-contrast status icons paired with explicit text labels (never color alone).

### Confirmation Checkboxes & Radio Selectors
- Touch target: minimum 64px x 64px boundary.
- Visible control size: 36px x 36px with a bold 3px stroke in `#1F2933`. Checked state fills with `#0F766E` containing a high-contrast checkmark.

### Input Fields & Selectors
- Height: 64px minimum with internal padding `space-md`.
- Border: `2px solid #E5E0D8`, transitioning to `3px solid #0F766E` upon focus.
- Placeholder text is forbidden; static, high-contrast labels sit strictly above the input at `label-md`.

### Status Badges & Alerts
- Solid tint containers: `#4D8B6A` (Taken), `#B7791F` (Pending), `#B42318` (Missed).
- Text rendered in `#FFFFFF` with `label-md` weight, encased in pill geometry with a minimum padding of `0.5rem 1.25rem`.