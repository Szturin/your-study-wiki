# Quality Guidelines

## Required Commands

Run before handing off meaningful frontend changes:

```bash
npm run lint
npm run typecheck
```

For research snapshot updates:

```bash
npm run snapshot:target
```

## UI Quality Rules

### 1. Keep accessibility reasonable by default

- Buttons should be real `<button>` elements
- Use `aria-pressed` for toggle-like controls
- Inputs should have visible labels or an obvious accessible wrapper

**Examples:** `src/components/dashboard/study-wall-dashboard.tsx`

### 2. Prefer data-driven rendering

Maps over typed data arrays are preferred over repeated hard-coded sections.

**Examples:**
- tracks list
- papers list
- findings list
- pillars list

### 3. Keep research logic isolated

The snapshot script must stay out of `src/`.

**Example:** `scripts/fetch-target-site-snapshot.mjs`

### 4. Document architectural decisions

Important product/architecture decisions belong in `docs/architecture/` and `docs/research/`.

**Examples:**
- `docs/architecture/frontend-foundation.md`
- `docs/research/zhentiqiang-open-front-end-analysis.md`

## Anti-patterns

- Silent type regressions
- Unlabeled clickable `div`s
- Mixing product code and competitor-research code in the same module
- Shipping a pixel-by-pixel clone instead of an original workbench
