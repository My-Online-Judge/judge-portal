# Admin Console — Design Brief

> Shared design direction for every `/admin` page. Read before building any admin `.vue`.
> Applied via the `frontend-design` method: compact token system, grounded in the subject,
> reviewed against generic AI defaults.

## Subject & job

An **administrative console for an online judge** (competitive programming). Users are
problem-setters and platform admins. The area's single job: manage **content** (problems),
**infrastructure** (judge servers), and **access** (roles, users) quickly and confidently. It is
an **ops tool**, not a marketing page — density, clarity, and trust beat decoration.

## Foundation (do NOT reinvent)

Extends the existing product design system: **shadcn-vue "new-york"** + **Tailwind v4** semantic
tokens in `src/assets/main.css` (incl. `--color-sidebar-*`, dark mode via `.dark`), **lucide**
icons, `cn()` from `src/lib/utils.ts`. Consistency with the contestant portal is intentional —
the admin area is a focused sub-section, not a separate visual identity. Use the existing
`src/components/ui/*` primitives (button, input, label, textarea, select, switch, dialog, table,
card, badge, pagination, toast, tooltip, dropdown-menu, avatar).

## Tokens

**Color** — reuse semantic tokens; spend color only on *meaning*:
- Canvas `bg-background`; panels `bg-card`; borders `border-border`; secondary text `text-muted-foreground`.
- Sidebar `bg-sidebar`/`text-sidebar-foreground`, active item `bg-sidebar-accent`.
- Primary action = `primary` (one per view). Delete = `destructive`.
- Status (via `Badge` + a small dot): **online/active → emerald**, **stale/warning → amber**, **offline/error → red**.
- Discipline: neutral canvas; no gradients, no decorative color.

**Type**:
- UI/body: inherit the app sans. Scale: page title `text-2xl font-semibold tracking-tight`;
  section `text-lg font-medium`; table headers `text-xs font-medium uppercase tracking-wide text-muted-foreground`.
- **Signature — monospace data.** Use `font-mono` for the judge/OJ vernacular: permission keys
  (`problem:create`), role names, IDs & slugs, metric numbers, hostnames/IPs, timestamps. This is
  the one bold, subject-grounded move that makes the console read like a real ops tool. Everything
  else stays quiet.

**Layout**:
- Shell: fixed left **sidebar (~240px)** with grouped sections + a content **top bar** (page title
  + breadcrumb + current admin identity). Content = cards/tables on `bg-background`.
- Sidebar groups (labels encode structure): **OVERVIEW** (Dashboard) · **CONTENT** (Problems) ·
  **INFRASTRUCTURE** (Judge servers) · **ACCESS** (Roles, Users). Show only items the user has
  permission for.
- **Dashboard `/admin`:** a KPI card row (Problems · Users · Judge servers online/total) = label +
  **monospace number** + small lucide icon + one context line (NOT a gradient hero number). Below:
  a compact "Judge server health" panel and a "Recent problems" table. A card whose data source
  isn't wired yet shows a graceful `—`/skeleton (Problems land Phase 1, Judge servers Phase 2,
  Users Phase 4).
- **Tables:** shadcn `Table`, `text-sm`, monospace for IDs/slugs, status `Badge`, right-aligned
  actions revealed by permission; paginate with the existing `Pagination`/`PaginationFooter`.
- **Dialogs:** shadcn `Dialog` for create/edit forms and delete confirms (no native `confirm`).

## Signature

The **monospace data treatment** + **status-dot pills** for judge/role/permission entities — the
one memorable, restrained element that makes the admin area feel purpose-built for a judge system.

## Quality floor (build to it silently)

- **Responsive:** sidebar collapses to an icon rail / drawer under `md`; wide tables scroll inside
  an `overflow-x-auto` container; the page body never scrolls horizontally.
- **Dark mode:** rely on tokens (work in both themes) — verify light *and* dark.
- **A11y:** visible keyboard focus (`focus-visible:ring`), labelled inputs, focus-trapped dialogs
  (shadcn handles), sensible `aria-*`; keep motion minimal and respect `prefers-reduced-motion`.
- **States:** every list/detail has explicit **loading** (skeleton), **empty** (an invitation to
  act), and **error** (what happened + retry). Never a blank screen.

## Copy (design material, from the user's side)

- Active-voice controls that name the outcome: "Create problem", "Save changes", "Delete problem",
  "Save permissions". A button's verb matches its toast ("Problem created", "Permissions saved").
- Name things by what the admin controls (Roles, Permissions, Judge servers), not internals.
- Empty/error states give **direction**, not mood: "No judge servers have reported in — check that
  a judge server is running." Errors state what happened + how to fix; never vague or apologetic.
- Sentence case, plain verbs, no filler.

## Reviewed against generic defaults

The three AI-cliché looks (cream+serif+terracotta / near-black+acid accent / broadsheet hairlines)
are marketing aesthetics and are **not** used — an admin console needs the product's neutral
system. The "big number + gradient accent" KPI cliché is explicitly avoided (label + monospace
number + context instead). The **monospace-data signature is derived from this subject** (a
judge/OJ, a code/terminal world), not a default — confirmed distinct and appropriate.
