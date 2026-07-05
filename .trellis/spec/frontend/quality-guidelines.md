# Quality Guidelines

## Required Commands

Run before handing off meaningful frontend changes:

```bash
npm run lint
npm run typecheck
```

Run before publishing or changing static-hosting behavior:

```bash
NEXT_PUBLIC_BASE_PATH=/your-study-wiki npm run build
npm run sync:pages
```

For research snapshot updates:

```bash
npm run snapshot:target
```

## UI Quality Rules

### 1. Keep accessibility reasonable by default

- Buttons should be real `<button>` elements.
- Use `aria-pressed` for toggle-like controls.
- Provide labels, titles, or accessible names for icon-only actions.
- Avoid clickable `div`s unless there is a strong reason and keyboard handling is included.

### 2. Prefer data-driven rendering

Maps over typed data arrays are preferred over repeated hard-coded sections.

Current examples:

- subject and chapter lists
- knowledge nodes
- question cards
- wrongbook/favorite collections
- mind-map nodes and connectors

### 3. Preserve layout isolation between views

List, mind-map, algorithm lab, startup animation, and modal surfaces should have clear containers and state gates. Switching a view should unmount or hide the inactive surface cleanly.

### 4. Keep research logic isolated

The snapshot script must stay out of `src/`.

### 5. Verify visual/interaction changes in a browser

For changes involving SVG, canvas-like scenes, drag/zoom, fullscreen, Markdown/LaTeX, or responsive layout, verify the page locally after build or dev-server startup.

### 6. Document architectural decisions

Important product/architecture decisions belong in `docs/architecture/`, `docs/research/`, `CLAUDE.md`, and Trellis specs.

## Anti-patterns

- Silent type regressions.
- Unlabeled icon buttons.
- Mixing product code and competitor-research code in the same module.
- Shipping static export changes without rebuilding and syncing generated output.
- Hand-editing generated GitHub Pages files.
