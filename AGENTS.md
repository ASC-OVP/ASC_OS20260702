# AGENTS.md

## Project Goal

ASC is an internal academy operations system.
The current goal is a full UI redesign without changing existing functionality.

This project is not a marketing website.
It is a practical admin tool for academy managers, instructors, and desk staff.

## Design Direction

Do not use KRDS as the design reference anymore.

Use the following design direction instead:

- Ant Design for enterprise admin layout structure
- GitHub Primer for calm, practical, tool-like visual tone
- Linear and Raycast only as light references for polish and interaction quality

Core keywords:

- Dense
- Clear
- Admin-first
- Spreadsheet-like
- Calm SaaS
- Practical internal tool

## Theme Direction

Support both light mode and dark mode.

Light mode:

- Use a soft gray app background
- Use white surfaces
- Use subtle gray borders
- Use a muted blue primary accent

Dark mode:

- Do not use pure black as the main background
- Use dark neutral backgrounds
- Use slightly lighter dark surfaces
- Use subtle gray borders
- Use muted blue as the primary accent
- Maintain strong text contrast

All colors should be managed through CSS variables, theme tokens, or the existing design token system.

## Strict Function Lock

This redesign must not change existing functionality.

Do not change:

- API route behavior
- Server actions
- Database schema
- Prisma models
- Authentication logic
- Permission logic
- Student, class, test, OMR, attendance, homework, clinic, payment, or SMS workflows
- Existing form submission behavior
- Existing onClick handlers
- Existing fetch, mutation, or server action logic
- Existing prop names and data shapes unless absolutely necessary

If a functional change seems necessary, stop and explain:

- Why it is necessary
- What files would be affected
- What behavior might change
- Whether there is a UI-only alternative

Do not make the functional change until the user confirms.

## Allowed UI Changes

You may change:

- Layout structure
- CSS and Tailwind classes
- Shared component styling
- Buttons
- Inputs
- Select controls
- Tables
- Modals
- Empty states
- Loading states
- Error states
- Sidebar and header visual structure
- Light and dark mode styling
- Accessibility attributes when they do not change behavior

## UI Rules

Avoid generic AI-generated UI patterns.

Do not use:

- Heavy gradients
- Glassmorphism
- Large shadows
- Floating rounded dashboard shells
- Decorative blobs
- Hero sections inside admin screens
- Marketing-style copy inside operational pages
- Oversized KPI cards
- Excessive badges
- Random bright colors
- Overly large border radius

Use:

- 6-8px radius for buttons and controls
- 8px or less for cards and panels
- Subtle 1px borders
- Compact spacing
- Clear table hierarchy
- Practical action bars
- Consistent form controls

## Layout Rules

Desktop is the priority for this redesign.
Mobile optimization can be handled later.

Use this general structure:

- Fixed sidebar
- Top action bar
- Main data workspace
- Optional right-side task panel only when useful

The student dashboard should feel like a spreadsheet-like data grid.
Filtering, searching, sorting, selection, and bulk actions should be easy to find.

## Interview Rule

Before starting any large redesign, architecture change, or multi-page UI update, interview the user first.

Do not immediately edit files when the task is broad or ambiguous.

Ask 3-7 focused questions about:

- Target screen or workflow
- Desired visual reference
- Light mode and dark mode expectations
- What must not change
- Priority pages
- Risky files or features
- Verification requirements

After the interview, summarize the answers into a short implementation plan.
Start coding only after the user confirms the plan.

For small, obvious UI fixes, no interview is required.

## Skill Usage

When doing frontend UI work, use Uncodixfy.
Use it to avoid generic AI UI patterns and make the interface feel like a real internal operations tool.

When planning a redesign, auditing UI, or deciding implementation order, use the frontend UX/UI planning skills from codex-skill-pack if available.

## Verification

After changes, run the relevant checks when possible:

- npm run lint
- npm run typecheck
- npm run build

Before finishing, verify:

- Existing functionality still works
- API calls were not changed
- Form submissions still work
- Light and dark mode are readable
- Tables remain dense and usable
- Buttons, inputs, selects, and tables are visually consistent
- No generic AI dashboard styling was introduced

## Borderless / Low-Border UI Direction

Prefer a borderless or low-border visual system across the app.

Avoid heavy visible borders around:
- buttons
- inputs
- selects
- cards
- panels
- filter bars
- table cells
- sidebar items
- list rows

Use these instead:
- subtle background tone differences
- soft surface elevation
- controlled shadows
- spacing and alignment
- hover and selected states
- focus-visible rings for accessibility

Tables and data grids should not look like every cell is trapped in a box.
Use header background, row hover, subtle dividers, and sticky areas to preserve readability.

Inputs and selects should feel interactive through surface contrast and focus rings, not thick borders.

Do not remove visual affordance.
Clickable, editable, selected, disabled, and read-only states must remain clear.