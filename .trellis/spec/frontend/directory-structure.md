# Directory Structure

## Current Layout

```text
src/
  app/
    layout.tsx
    page.tsx
  components/
    dashboard/
      study-wall-dashboard.tsx
    ui/
      section-card.tsx
  hooks/
    use-study-wall-dashboard.ts
  lib/
    mock-study-wall.ts
  types/
    study-wall.ts

docs/
  architecture/
  research/

scripts/
  fetch-target-site-snapshot.mjs
```

## Rules

### 1. Route files stay thin

`src/app/page.tsx` should assemble page data and render the screen entry component. Do not turn route files into giant UI files.

**Example:** `src/app/page.tsx`

### 2. Group interactive UI by screen/domain

Interactive modules for the home workbench live in `src/components/dashboard/`.

**Example:** `src/components/dashboard/study-wall-dashboard.tsx`

### 3. Keep reusable shells in `components/ui`

Small, visual wrappers that do not own business state belong in `src/components/ui/`.

**Example:** `src/components/ui/section-card.tsx`

### 4. Keep domain contracts separate from seed data

- Types go to `src/types/`
- Seed/mock/adapters go to `src/lib/`

**Examples:**
- `src/types/study-wall.ts`
- `src/lib/mock-study-wall.ts`

### 5. Research code never mixes with UI code

Anything that touches the target site for analysis belongs in `scripts/` or `docs/research/`, not in `src/`.

**Examples:**
- `scripts/fetch-target-site-snapshot.mjs`
- `docs/research/zhentiqiang-open-front-end-analysis.md`

## Anti-patterns

- Putting scraping logic under `src/`
- Putting all UI into `src/app/page.tsx`
- Reusing target-site raw payload shapes directly in components
