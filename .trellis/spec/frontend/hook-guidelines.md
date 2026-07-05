# Hook Guidelines

## Current Hook Strategy

Hooks are used for **screen state orchestration, local persistence, and derived filters**, not as a default abstraction for every JSX fragment.

## Rules

### 1. Prefer one hook per screen workflow

`useStudyWallDashboard` owns:

- selected subject
- selected chapter
- selected knowledge node
- selected question
- search query
- mastery and favorite maps
- last mastered record
- derived visible question lists
- sanitized localStorage persistence

### 2. Keep derived data in `useMemo`

Filtering, tree grouping, and selected-item lookup should live in `useMemo` or pure helpers instead of repeated inline chains in JSX.

Current examples inside `src/hooks/use-study-wall-dashboard.ts`:

- `selectedSubject`
- `selectedChapter`
- `overviewQuestions`
- `treeQuestionsByKnowledge`

### 3. Use effects only for side effects

Valid effects in this codebase include:

- localStorage load/save
- timers and animation cleanup
- DOM measurement and ResizeObserver
- keeping imperative drag/zoom refs in sync

Do not use effects for pure derivation that can be computed during render.

### 4. Browser APIs must stay behind client boundaries

Access `window`, `localStorage`, timers, `ResizeObserver`, and DOM refs only from client components/hooks.

## Anti-patterns

- Creating many tiny hooks before the screen behavior is stable.
- Fetching competitor research data directly inside UI hooks.
- Persisting unchecked localStorage payloads without schema/version handling.
- Leaving timers or animation frames without cleanup.
