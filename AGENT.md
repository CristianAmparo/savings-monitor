# AGENT.md — UI/UX & Frontend Standards

Binding rules for all UI work in **Savings Monitor**, an offline, mobile-first personal finance PWA (savings accounts, loans-as-accounts, MC taxi daily income calendar, monthly money targets).

**Principle:** consistency beats novelty. The app must feel like one coherent, professional, banking-grade product. When unsure whether to create a new style or reuse an existing one, reuse.

---

## 0. Stack & Architecture

- Plain **HTML + CSS + vanilla JS** (ES modules). No framework, no build step, no CSS preprocessor unless the owner approves.
- **IndexedDB** for data. **Service worker** for offline. Installable PWA.
- **Fully offline:** no CDN fonts, no CDN icons, no remote scripts or images. Everything is vendored locally.
- Mobile-first; the primary device is a phone. Desktop must work but is secondary.
- Do not add dependencies without asking. Prefer zero-dependency solutions.

Planned structure (keep to it; extend, don't reinvent):

```
index.html
manifest.webmanifest
sw.js
css/
  tokens.css        # ALL design tokens (the only place raw values live)
  base.css          # reset, typography, element defaults
  layout.css        # app shell, page header, sections, tab bar
  components.css    # button, input, card, list, modal, badge, calendar, etc.
js/
  db.js             # IndexedDB access only
  ui/               # reusable UI builders (modal, toast, etc.)
  pages/            # one module per screen
  icons.js          # icon helper
icons/              # vendored SVG sprite / files
```

---

## 1. UI Direction

- Minimal, clean, professional — modern banking/fintech feel.
- Clarity, hierarchy, readability, and usability come first. Whitespace over decoration.
- No playful, flashy, or multi-colorful treatments. No illustrations or mascots.
- Money figures are the hero: large, legible, right-aligned in lists, tabular numerals.
- Every screen shares the same shell, header, spacing, and components.

---

## 2. Icons

- **Never** use emojis as UI icons. **Never** use text characters (`+`, `×`, `>`, `✓`, `⚙`) as icon substitutes when a proper icon exists.
- Icon set: **Lucide** (outline, 24×24 viewBox, 2px stroke, round caps/joins). Vendor the needed SVGs locally in `icons/` (one sprite file preferred). Do not introduce a second icon set.
- All icons must be identical in style:
  - Stroke `1.75`–`2` (use a single value project-wide, via token), `stroke="currentColor"`, `fill="none"`.
  - Sizes only: **16** (inline/dense), **20** (default, buttons/lists), **24** (nav, headers). No other sizes.
  - Color via `currentColor` (inherits text color); never hardcode icon colors.
  - Vertically centered with adjacent text; gap between icon and label is `--space-2`.
- Don't mix filled/outlined/3D/emoji styles.
- No decorative icons. An icon must communicate or trigger something.
- Accessibility: icon-only buttons need `aria-label`; decorative icons get `aria-hidden="true"`.
- The currency symbol `₱` is text, not an icon.

---

## 3. Colors

Limited palette, defined **only** in `tokens.css`. Components reference tokens, never hex values.

**Light theme (default)**

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#1E4FD8` | Primary actions, active nav, links |
| `--color-primary-hover` | `#1A43B8` | Primary hover/pressed |
| `--color-primary-subtle` | `#EAF0FD` | Selected/active backgrounds |
| `--color-bg` | `#F6F7F9` | App background |
| `--color-surface` | `#FFFFFF` | Cards, sheets, inputs |
| `--color-surface-muted` | `#F0F2F5` | Secondary surfaces, disabled fills |
| `--color-border` | `#E3E6EB` | Borders, dividers |
| `--color-text` | `#14181F` | Primary text |
| `--color-text-muted` | `#5B6472` | Secondary text, labels |
| `--color-text-disabled` | `#9AA2AF` | Disabled text |
| `--color-success` | `#16794C` | Gain, surplus, goal reached, positive net |
| `--color-success-subtle` | `#E6F4EC` | Success backgrounds |
| `--color-warning` | `#A15C07` | Below target, caution |
| `--color-warning-subtle` | `#FDF1DF` | Warning backgrounds |
| `--color-error` | `#B3261E` | Loss, destructive, validation errors |
| `--color-error-subtle` | `#FBE9E7` | Error backgrounds |
| `--color-info` | `#1E4FD8` | Informational (same hue as primary) |

**Dark theme:** redefine the same tokens under `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`. Components must work in both without changes. Never use pure black or pure white backgrounds in dark.

**Rules**
- No new color for an individual component. Need a color? It must map to an existing token; if truly new, add a token and document it here.
- No gradients (exception: none). No bright/saturated fills.
- **Semantic consistency (fixed meanings):**
  - Success (green): positive net, income gain, target reached/exceeded.
  - Warning (amber): below target / still lacking, nearing a limit.
  - Error (red): negative net/loss, destructive actions, validation errors.
  - Info/primary (blue): neutral emphasis, selection, links.
- Never rely on color alone: pair with a sign (`+`/`−`), label, or icon.
- Text contrast ≥ **4.5:1** (3:1 for large text and UI boundaries).

---

## 4. Typography

- **Font family:** system stack only (offline, no web fonts):
  `--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;`
- **Numbers:** all currency and numeric columns use `font-variant-numeric: tabular-nums;` (`.num` utility).
- Base size 16px. Never go below 12px.

| Token / role | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `--text-display` | 32px | 700 | 1.2 | Hero totals (dashboard grand total) |
| `--text-h1` | 24px | 600 | 1.3 | Page title |
| `--text-h2` | 20px | 600 | 1.3 | Section title |
| `--text-h3` | 16px | 600 | 1.4 | Card title, list group header |
| `--text-body` | 16px | 400 | 1.5 | Body, list item primary text |
| `--text-label` | 14px | 500 | 1.4 | Form labels, list secondary text |
| `--text-helper` | 13px | 400 | 1.4 | Helper/validation text |
| `--text-caption` | 12px | 400 | 1.4 | Timestamps, calendar day numbers, meta |
| `--text-button` | 15px | 600 | 1 | Buttons |
| `--text-nav` | 12px | 500 | 1 | Bottom tab bar labels |

- Allowed weights: **400, 500, 600, 700** only.
- One `h1` per screen. Don't skip heading levels.
- Use `--color-text` for primary, `--color-text-muted` for secondary. No other text colors besides semantic ones.
- No arbitrary `font-size` values in components; use the tokens.

---

## 5. Spacing

4px base scale. **Only** these values are allowed for padding, margin, and gap:

| Token | px |
|---|---|
| `--space-1` | 4 |
| `--space-2` | 8 |
| `--space-3` | 12 |
| `--space-4` | 16 |
| `--space-5` | 20 |
| `--space-6` | 24 |
| `--space-8` | 32 |
| `--space-10` | 40 |
| `--space-12` | 48 |

- Page horizontal gutter: `--space-4` (mobile), `--space-6` (≥768px).
- Gap between page sections: `--space-6`. Card inner padding: `--space-4`. Gap between stacked form fields: `--space-4`. List row padding: `--space-3` vertical / `--space-4` horizontal.
- No arbitrary values (`13px`, `17px`, `22px`, `27px`). Exceptions only with a code comment explaining why.
- Touch targets ≥ **44×44px**.

---

## 6. Border Radius

| Token | px | Use |
|---|---|---|
| `--radius-sm` | 6 | Badges, small chips, inputs' inner elements |
| `--radius-md` | 10 | Buttons, inputs, selects, list items |
| `--radius-lg` | 14 | Cards, containers, calendar |
| `--radius-xl` | 20 | Modals/bottom sheets (top corners) |
| `--radius-full` | 999 | Avatars, status dots, toggle switches **only** |

- No pill-shaped buttons or cards. `--radius-full` only where shape is functional.
- No other radius values.

---

## 7. Components

Before building anything:
1. Check `components.css` and `js/ui/` for an existing component.
2. Reuse it. 3. Extend it via a variant/prop. 4. Create new only with a clear reason, and make it reusable.

Canonical component set (one implementation each): **Button, Icon Button, Input, Select, Textarea, Amount Input, Card, List/List Row, Modal/Bottom Sheet, Tabs, Bottom Tab Bar, Page Header, Badge, Alert, Toast, Progress Bar, Calendar, Stat (label + value), Empty State, Skeleton, Confirm Dialog.**

Do not create visually different versions of the same component without a documented reason in this file.

## 8. Component Variants

Use modifier classes/attributes, never separate implementations.

- Button: `.btn` + `--primary | --secondary | --ghost | --destructive`, size `--sm | --md(default)`
- Badge: `--neutral | --success | --warning | --error | --info`
- Alert/Toast: `--info | --success | --warning | --error`
- Never: `BlueButton`, `GreenButton`, `SmallBlueButton`, `NewButton`, `.btn2`.

---

## 9. CSS Architecture

- All raw values (colors, sizes, spacing, radii, shadows, heights, z-index) live in `tokens.css` as CSS custom properties. Components use `var(--…)`.
- Naming: BEM-lite — `.block`, `.block__element`, `.block--modifier` (e.g. `.card`, `.card__title`, `.btn--primary`).
- Utilities (`.num`, `.text-muted`, `.stack`, `.row`, `.sr-only`) are allowed but small and defined once.
- Avoid: duplicated CSS, inline `style=""` (except dynamic values like a progress width via a CSS variable), `!important`, magic numbers, per-page overrides of shared components, ID selectors for styling.
- Component heights: `--control-height: 44px` (buttons, inputs, selects). `--control-height-sm: 36px` (small buttons only).
- Z-index scale via tokens: `--z-header`, `--z-tabbar`, `--z-modal`, `--z-toast`.
- Transitions: `--transition: 150ms ease`. Respect `prefers-reduced-motion`.

---

## 10. Shadows, Borders, Elevation

- Default separation = **1px solid `--color-border`** on `--color-surface`. Prefer borders over shadows.
- Shadow tokens (subtle only):
  - `--shadow-sm: 0 1px 2px rgba(16,24,40,.06)` — cards (optional)
  - `--shadow-md: 0 4px 12px rgba(16,24,40,.10)` — dropdowns, toasts
  - `--shadow-lg: 0 12px 32px rgba(16,24,40,.16)` — modals/sheets
- No glow, neumorphism, heavy or colored shadows, or blur/glass effects.

---

## 11. Forms

- One input style everywhere: height `--control-height`, padding `0 var(--space-3)`, `--radius-md`, 1px `--color-border`, `--color-surface` background, `--text-body`.
- States: **hover** (border darkens), **focus** (2px `--color-primary` outline, offset 1px — never removed), **error** (border + message in `--color-error`, plus icon/text), **disabled** (`--color-surface-muted`, `--color-text-disabled`, no pointer events).
- Label above field (`--text-label`, `--color-text`), required marker if needed, helper/error text below (`--text-helper`).
- Money inputs: `inputmode="decimal"`, `₱` prefix as text, tabular numerals, right-aligned value.
- Date inputs use the native date picker; the taxi flow is driven by the calendar.
- Validate on submit and on blur; show errors inline, never only via `alert()`.
- Every input has an associated `<label>`.

---

## 12. Buttons

- Height `--control-height` (44px), padding `0 var(--space-4)`, `--radius-md`, `--text-button`.
- Icon 20px, gap `--space-2`. Icon-only buttons are 44×44.
- One **primary** button per view/section. Destructive actions use `--destructive` and require confirmation.
- States: hover, active/pressed, focus-visible ring, disabled, loading (spinner replaces icon, width stays stable).
- Full-width primary buttons are allowed in forms/sheets on mobile. No oversized or decorative buttons.
- Floating action button: allowed once per screen max, only for the primary "add" action, using the standard primary style.

---

## 13. Responsive

- Mobile-first. Breakpoints: `≥600px` (large phone/small tablet), `≥900px` (desktop). Define once as documented constants.
- Mobile: bottom tab bar (**Home · Savings · Expenses · Taxi · Settings**; Targets is opened from the Home target card), single column, bottom sheets for forms.
- ≥900px: tab bar becomes a left side nav; content max-width `720px` (centered); modals become centered dialogs. Same tokens, same components.
- Respect safe areas (`env(safe-area-inset-*)`) for the tab bar and sheets.
- Don't just scale up desktop — reflow. Keep typography, spacing, and component styles identical across sizes.
- No horizontal page scroll. Test at 360px width minimum.

---

## 14. Accessibility

- Contrast per section 3. Visible `:focus-visible` on every interactive element.
- Use semantic elements (`button`, `a`, `label`, `ul`, `table`, `dialog`/`role="dialog"` with `aria-modal`). Never `div` as a button.
- Full keyboard operation; modals trap focus, close on `Esc`, and restore focus.
- Icon-only controls have `aria-label`; decorative icons `aria-hidden="true"`.
- Calendar days are buttons with an accessible label (e.g. "October 5, net ₱1,200").
- Status (gain/loss, lacking/exceeded) never conveyed by color alone.
- Use `aria-live="polite"` for toasts and form errors.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

---

## 15. States (Loading, Empty, Error, Success, Disabled)

- **Loading:** skeleton blocks (`--color-surface-muted`, subtle pulse) for lists/cards; spinner only inside buttons. IndexedDB is fast, so avoid flashing a loader for <150ms.
- **Empty:** single shared Empty State component — outline icon (24/32), one-line title, one-line hint, one primary action (e.g. "No accounts yet — Add account").
- **Error:** inline alert (`--error`) with a plain message and a retry/fix action. Destructive confirms use the shared Confirm Dialog.
- **Success:** toast (auto-dismiss ~3s), `--success`, e.g. "Balance updated". Include **Undo** for adjustments and deletions where feasible.
- **Disabled:** reduced contrast per tokens; never remove the element silently without explanation.

---

## 16. Page Layout

Every screen uses the shared shell:

```
Page Header   → title (h1) [+ optional back button, + optional header action icon-button]
Content       → sections separated by --space-6
  Section     → optional h2 + cards/lists
Bottom Tab Bar (mobile) / Side Nav (≥900px)
```

- Lists inside a card with 1px dividers (`--color-border`), row padding per section 5.
- Forms and edit flows open in a **bottom sheet** (mobile) / dialog (desktop), not a new page, unless the flow is long.
- Toolbars/filters sit directly under the header, using Tabs or segmented controls (the shared Tabs component).
- Do not invent a new layout per page.

### Screen-specific patterns

- **Dashboard:** Stat hero (grand total of savings accounts, `--text-display`), cash vs loans breakdown (optional account-type tag), target progress card, a "Spent" card (today/week/month total), and a separate taxi summary (today/week/month net). Taxi figures are display-only and never included in the grand total or target progress.
- **Target progress:** Progress Bar + message. Below target → `--warning` bar, message "₱12,000 to go" with secondary line "₱38,000 of ₱50,000 · 76%". At/above target → `--success` bar, "₱3,500 over target" with "₱53,500 of ₱50,000 · 107%". All UI copy is plain English (no Tagalog/Taglish). Wording lives in one place (a message helper) so it can be changed centrally. No emojis in the message.
- **Savings list:** account rows = name + type badge (left), balance (right, tabular). Tap → account detail with history and an adjust sheet (Add / Subtract / Set / Transfer).
- **Taxi calendar:** Month grid (Mon–Sun). Each day cell shows day number (`--text-caption`) and net amount (`--text-caption`, semantic color + sign). Today has a `--color-primary` outline; days without entries are neutral. Week total column on the right; month total in a Stat row above. Month navigation via icon buttons (chevron-left / chevron-right). The taxi tracker is **records only** and fully independent of savings: it never changes account balances, the grand total, or the monthly targets, and has no transfer or link to any account. Tapping a day opens the entry sheet with only **Income** and **Expense** fields; net is computed (income − expense). One entry per day, editable and deletable. No other fields (no trips, distance, notes, or expense categories).
- **Expenses:** separate from taxi. An expense has amount, date, paying account, category, and optional note. Saving deducts the amount from the chosen account and logs a "Spent" entry in that account's history; editing applies only the difference; deleting refunds the account. Validation: amount must be > 0, account and category are required, and an expense larger than the account's current balance is blocked with an inline error ("Amount exceeds the balance of GCash (₱X)"). Categories: default list (Food, Transport, Bills, Health, Shopping, Other), editable in Settings. Reports: Day / Week / Month / Year tabs with prev/next navigation, total spent, daily average, a bar chart (single `--color-primary`; no per-category colors), breakdown by category with amount and percentage, and the expense list for the period. There is no quick-entry feature.
- **Targets (monthly expectation):** one row per month with **Expected** (target) and **Actual** (total money for that month, entered by the user or filled with the current savings total via a "Use current total" action). Each row shows the difference with the shared message pattern: below expected → `--warning` "₱X to go"; at or above → `--success` "₱X over target". Rows for months with no Actual yet show only the expected amount. Current month highlighted; add/edit/delete months. A month-by-month comparison list (Expected, Actual, Difference) makes it easy to see which months were short or ahead.

---

## 17. Visual Consistency Rule

If two things do the same job, they look and behave identically. Before building, inspect existing components and reuse their typography, spacing, colors, radius, borders, icons, and interaction states. Never add a style because it looks good in isolation.

## 18. Process for Every UI Task

1. Inspect existing components, `tokens.css`, and `components.css`.
2. Identify reusable pieces.
3. Reuse tokens and patterns.
4. Introduce new styles only when necessary.
5. Any new pattern → make it reusable, add it to `components.css`, and document it here.
6. Compare the result against existing screens for visual consistency.

---

## 19. Money & Data Display Conventions

- Currency format: `₱` + thousands separators, 2 decimals when non-zero cents, otherwise omit (e.g. `₱1,250`, `₱1,250.50`). One shared formatter (`formatPeso`) — never format inline.
- Negative values: `−₱500` (true minus sign), semantic error color where meaning is loss.
- Positive deltas: `+₱500` with success color.
- Dates: one shared formatter; the week starts on **Monday**.
- Hide-balance mode masks amounts with `••••` via the same formatter; layout must not shift.
- Store money as integers in centavos if precision issues arise; never use floating point for sums without rounding.

---

## 19a. Copy

- All user-facing text is in plain, professional **English**. No Tagalog or Taglish, no slang, no emojis.
- Short, direct labels (e.g. "Add account", "Adjust balance", "Income", "Expense", "Net").

---

## 20. Design Quality Checklist (before marking UI work done)

- [ ] No emojis used as icons; no text-character icons.
- [ ] All icons are Lucide outline, allowed sizes only, `currentColor`.
- [ ] Only token colors; semantic colors used per fixed meanings.
- [ ] Typography uses the token scale and allowed weights.
- [ ] Spacing uses only `--space-*` tokens; touch targets ≥ 44px.
- [ ] Radius uses only `--radius-*` tokens.
- [ ] Existing components reused; no duplicates created.
- [ ] No duplicated CSS, no stray inline styles or magic numbers.
- [ ] Buttons and inputs match the shared styles and states.
- [ ] Works offline with no remote assets.
- [ ] Works in light and dark themes.
- [ ] Verified at 360px width and at ≥900px.
- [ ] Loading / empty / error / success states use the shared patterns.
- [ ] Keyboard and screen-reader basics pass (focus visible, labels, aria).
- [ ] Money formatting uses the shared formatter.
- [ ] The screen looks like it belongs to the same app as the others.

---

## 21. Guiding Principle

Do not optimize any single screen to look impressive in isolation. Optimize for one coherent, trustworthy, professional product. Consistency over novelty. Reuse over reinvention.
