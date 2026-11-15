---
name: Warm Clinical
colors:
  surface: '#FFFFFF'
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
  bg: '#FAF8F4'
  border: '#E5E0D8'
  text: '#1F2933'
  text-muted: '#52606D'
  primary-hover: '#0B5F59'
  primary-soft: '#E6F2F0'
  success: '#4D8B6A'
  success-soft: '#E8F2EC'
  warning: '#B7791F'
  warning-soft: '#FBF1DE'
  danger: '#B42318'
  danger-soft: '#FBEAE8'
  focus-ring: '#0F766E'
typography:
  headline-alarm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-alarm-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-h1:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-h1-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-h2:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-h2-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  label-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-elder:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-caretaker:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caretaker:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system embodies a calm, warm clinical aesthetic tailored for elderly individuals and their caregivers. Rejecting tech-centric tropes, aggressive minimalism, and digital gimmicks, it establishes an atmosphere reminiscent of an attentive, neighborhood clinic. The interface feels unhurried, dependable, dignified, and tactile.

Every interaction prioritizes clarity, cognitive ease, and physical accessibility. Visual clutter is eliminated: every element serves an explicit clinical or communication purpose. Interfaces feature generous spacing, high-contrast readable typography, and explicit visual confirmations. 

Strict anti-patterns include: no luminous gradients, decorative blur effects, low-contrast placeholder fields, or autonomous AI metaphors. Instead, the visual language relies on structural clarity, solid fills, 1px border dividers, and high legibility.

## Colors
The color architecture is built around warm, earthy medical tones designed to prevent screen glare and eye fatigue while securing strict WCAG AAA compliance (7:1 contrast ratio) across critical text elements.

- **Primary (`#0F766E`)**: A deep spruce teal conveying clinical authority and calm. Used for core action buttons, selected states, and explicit interactive focal points.
- **Secondary / Success (`#4D8B6A`)**: A soft sage green applied to completed medications, confirmations, and verified actions.
- **Tertiary / Warning (`#B7791F`)**: An amber ochre designating pending approvals, approaching medication times, or items needing inspection.
- **Danger (`#B42318`)**: A grounded brick red reserved for missed doses, critical system alerts, and destructive actions.
- **Backgrounds & Neutral (`#FAF8F4`, `#FFFFFF`, `#1F2933`)**: Warm off-white canvases paired with pure white surfaces and deep slate neutral ink, providing soft contrast without harsh starkness.

Color is never used as the sole conveyor of information; every status color is paired with a distinct Lucide line icon and an explicit text label.

## Typography
The system uses Atkinson Hyperlegible Next as its primary typeface to maximize distinguishability among similar glyph shapes (such as 0 vs O, or 1 vs l vs I) for elderly users. Inter is selectively applied to high-density caregiver dashboards.

Font weights are restricted strictly to 400 (Regular), 600 (Semibold), and 700 (Bold). Thin and ultralight weights (<400) are forbidden. Line heights maintain a spacious ratio (1.5 for body copy, 1.2–1.25 for titles). Maximum line length is capped at 65 characters to protect reading continuity. Layouts are designed to gracefully accommodate user-driven scale adjustments (up to 130% root text magnification) without component clipping or horizontal overflow.

## Layout & Spacing
The layout adheres strictly to an 8-point base spacing rhythm (4, 8, 12, 16, 24, 32, 48, 64px) with fixed-distance parameters.

- **Elder Interfaces**: Single-column layout exclusively, constrained to a maximum container width of 560px, maintaining strict linear progression and zero visual ambiguity.
- **Caregiver Interfaces**: Single-column on mobile, expanding to a structured 12-column grid capped at 960px container width for viewports 768px and wider.
- **Target Sizes**: Touch and click targets are enforced at a minimum height and width of 56px for all elder interfaces (48px for caregiver contexts), with a minimum 12px dead zone between adjacent interactive targets to prevent accidental activations.

## Elevation & Depth
Depth is established primarily through 1px solid borders (`#E5E0D8`) and deliberate tonal layering, avoiding stacked drop shadows or blurry backdrops.

Only a single, highly subtle elevation shadow token is permitted across the system: `0 1px 2px rgba(31, 41, 51, 0.08)`. This soft depth serves strictly to lift interactive cards and dialog sheets from the warm background canvas. Multi-tier drop shadows, glowing effects, and layered cards-within-cards are prohibited.

## Shapes
The shape language combines gentle, human-friendly curvature with clinical structure:
- **Base Components & Cards**: Standardized at a 16px corner radius (`rounded-lg`), softening content frames while keeping boundaries well defined.
- **Inputs & Chips**: Standardized at 10px corner radius (`rounded-md`) for compact structure.
- **Status Pills & Action Triggers**: Fully rounded (`rounded-full`) for status indicators, badges, and primary circular audio/action triggers.

## Components

- **Buttons**:
  - *Primary*: Solid `#0F766E` background with white text, minimum height 56px, full width on elder screens, 600 font weight. Focus renders an assertive 3px ring with 2px offset.
  - *Secondary*: 2px solid `#0F766E` border with transparent background and `#0F766E` text.
  - *Destructive*: Solid `#B42318` background with white text.
  - *States*: Explicit states for default, hover, active/pressed, and loading (accompanied by accessible text, e.g., "Saving..."). Disabled states use 50% opacity and `aria-disabled="true"`.

- **Cards**:
  - White surface background (`#FFFFFF`), 1px solid border (`#E5E0D8`), 16px border radius, 16px to 24px internal padding. Cards are never nested within other cards; lists use 1px horizontal rule dividers instead.

- **Status Chips**:
  - Fully rounded pills containing a tinted soft background (`--*-soft`), a 24px Lucide line icon, and an explicit text label (e.g., green tint + `check-circle-2` + "Taken").

- **Input Fields**:
  - Persistent labels located strictly above inputs (never placeholder-only). 56px minimum height, 1px border (`#E5E0D8`), transitioning to a 2px `#0F766E` stroke on focus. Error messages render below the field in `#B42318` paired with an `alert-circle` icon.

- **Lists & Timeline Rows**:
  - Minimum 56px target height with leading Lucide icon, prominent item title (600 weight), muted secondary detail line, and trailing action chevron or status badge.

- **Audio Player / Voice Component**:
  - Dedicated circular 64px play/pause button, paired with an accessible, high-contrast SVG waveform visualization in teal and explicit elapsed/remaining time indicators.