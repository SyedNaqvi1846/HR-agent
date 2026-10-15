---
name: Enterprise HR Platform
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c8c5d3'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#918f9c'
  outline-variant: '#474651'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#272377'
  primary-container: '#312e81'
  on-primary-container: '#9c9af4'
  inverse-primary: '#5654a8'
  secondary: '#b9c7df'
  on-secondary: '#233144'
  secondary-container: '#3c4a5e'
  on-secondary-container: '#abb9d1'
  tertiary: '#89ceff'
  on-tertiary: '#00344d'
  tertiary-container: '#003e5b'
  on-tertiary-container: '#26aef2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#100563'
  on-primary-fixed-variant: '#3e3c8f'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-xl:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system is built for a professional enterprise HR and recruitment platform. The brand personality is authoritative, reliable, and deeply functional, engineered to instill confidence in high-stakes hiring decisions. The UI evokes a sense of clarity, precision, and operational efficiency.

We employ a **Corporate / Modern** design style characterized by structured information architecture, high-contrast readability, generous whitespace balanced with dense data tables, and an absence of frivolous ornamentation. Every visual element serves to accelerate recruiter workflows and surface candidate signal over noise.

## Colors

The color palette is anchored by a commanding deep indigo primary, representing stability and enterprise trust, paired with slate secondary tones for structural UI elements. High-contrast neutral shades ensure accessibility for intensive, all-day recruiter usage within a dark mode environment.

- **Primary (Deep Indigo):** Used for primary actions, active states, and key navigational anchors.
- **Secondary (Slate):** Applied to borders, secondary metadata, and structural dividers.
- **Neutral (Dark Slate):** Drives high-contrast text and primary iconography against dark surfaces.
- **System Accents:** Reserved strictly for status indicators (e.g., candidate pipeline stages, match scores, alerts).

## Typography

Typography prioritizes absolute legibility and scannability. Using a single systematic typeface family ensures visual harmony across dense data tables, candidate profiles, and analytical dashboards. Font weights are strictly constrained to regular (400), medium (500), and semibold (600) to maintain hierarchical clarity without unnecessary decorative flourishes.

Ensure all text elements meet high-contrast accessibility ratios against their respective dark backgrounds. Use tabular figures for numeric data, metrics, and dates in candidate comparison views.

## Layout & Spacing

The layout relies on a **12-column fluid grid** system encased within a max-width container to balance large desktop monitoring with readable line lengths. The rhythm is built on a strict 4px/8px baseline grid, ensuring precise alignment of complex candidate cards, filter sidebars, and data grids.

- **Breakpoints:** Mobile (< 768px), Tablet (768px - 1024px), Desktop (> 1024px).
- **Gutters:** Standardized at 24px (`1.5rem`) on desktop to separate multi-column candidate pools clearly.
- **Margins:** Outer canvas margins scale from 16px on mobile to 32px on enterprise desktop viewports.

## Elevation & Depth

Depth is conveyed through **low-contrast outlines and tonal layers** rather than heavy drop shadows, aligning with clean enterprise software paradigms suited for dark mode interfaces. 

- **Surfaces:** Use flat, high-contrast dark background shifts to delineate interactive modules.
- **Borders:** Utilize crisp 1px borders in secondary slate tones to separate structural panels, modals, and card containers.
- **Focus States:** High-contrast 2px solid primary rings must be applied to all interactive elements to support keyboard navigation and accessibility standards.

## Shapes

The shape language uses a **Soft** profile (`1`), featuring deliberate 0.25rem border-radius on standard elements and 0.5rem (`rounded-lg`) on structural cards and containers. This subtle softening prevents the UI from feeling overly harsh or utilitarian while maintaining the crisp, professional rigor required for enterprise software. Avoid pill shapes except for status badges and skill tags.

## Components

Components are engineered for high-frequency recruiter actions, emphasizing speed, dense information display, and fault tolerance.

- **Buttons:** Primary buttons use the deep indigo fill with high-contrast text. Secondary and ghost variants utilize slate borders and text. Maintain a minimum touch/click target height of 40px.
- **Badges & Chips:** Essential for displaying skills, years of experience, and match percentages. Skill badges use compact padding, neutral slate background fills, and light text for rapid horizontal scanning.
- **Cards:** Candidate summary cards feature dark structured backgrounds, 1px slate borders, and structured internal grid layouts separating avatar, key metrics, matching skills, and quick-action toolbars.
- **Input Fields & Filters:** Form controls feature persistent floating or top-aligned labels, high-contrast borders, and clear inline validation states to streamline candidate note-taking and search queries.
- **Data Tables & Lists:** Optimized for dense scanning with zebra-striping options, sticky headers for long candidate lists, and inline action menus.