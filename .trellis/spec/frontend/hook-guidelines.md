# Hook Guidelines

## Current Hook Strategy

Hooks are used for **screen state orchestration and derived filters**, not for everything.

## Rules

### 1. Prefer one hook per screen workflow

`useStudyWallDashboard` owns:

- selected track
- selected paper
- selected topic
- search query
- derived visible question list
- derived mastery summary

**Example:** `src/hooks/use-study-wall-dashboard.ts`

### 2. Keep derived data in `useMemo`

Filtering and summary calculation live in `useMemo`, not in render-time inline chains all over the JSX.

**Examples inside `src/hooks/use-study-wall-dashboard.ts`:**
- `selectedTrack`
- `selectedPaper`
- `visibleQuestions`
- `masterySummary`

### 3. Use `useEffect` only for dependent-state resets

In this codebase, effects are mainly used to keep dependent state valid when the parent selection changes.

**Examples:**
- reset paper/topic/query when track changes
- reset topic when the current paper no longer contains it

### 4. Server route files should not use client hooks

`src/app/page.tsx` stays hook-free and server-first.

## Anti-patterns

- Creating many tiny hooks before the screen behavior is stable
- Using effects for pure derivation that should be `useMemo`
- Fetching competitor research data directly inside UI hooks
