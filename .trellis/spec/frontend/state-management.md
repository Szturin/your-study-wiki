# State Management

## Current State Split

### Server / static state

Seed data and architecture constants are imported from `src/lib/mock-study-wall.ts` at the route layer.

**Example:** `src/app/page.tsx`

### Screen-local interactive state

The dashboard owns its own UI state through `useStudyWallDashboard`.

**Example:** `src/hooks/use-study-wall-dashboard.ts`

State currently includes:

- selected track id
- selected paper id
- selected topic id
- search query

### No global store yet

We are intentionally **not** introducing Zustand/Redux/etc. in the first foundation pass.

Reason: current state does not cross routes yet.

## Rules

1. Keep state as local as possible.
2. Only promote to a global store when state must survive route boundaries or be shared by distant trees.
3. Keep research snapshots out of app runtime state.

## Anti-patterns

- Global store for single-screen filters
- Duplicating derived counts in state
- Persisting target-site raw payloads as app state without adaptation
