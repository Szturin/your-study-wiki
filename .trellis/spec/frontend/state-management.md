# State Management

## Current State Split

### Server / static state

Seed data and adapted import output are imported from `src/lib/` at the route layer.

Current examples:

- `src/lib/mock-study-wall.ts`
- `src/lib/signal-system-import.ts`

### Screen-local interactive state

The dashboard owns its UI state through React state and `useStudyWallDashboard`.

State includes:

- selected subject id
- selected chapter id
- selected knowledge id
- selected question id
- search query
- wrongbook/favorite/mastery maps
- last mastered record
- view mode, mind-map layout, drag/zoom state, and modal state

### Local-first persisted user state

User learning state persists in browser localStorage under `study-wiki-wall.persisted-state`.

Persisted data currently includes:

- schema `version`
- `questionMasteryMap`
- `questionFavoriteMap`
- `lastMasteredRecord`

The hook sanitizes persisted data against current valid question ids and known mastery values before applying it.

### No global store yet

We are intentionally not introducing Zustand/Redux/etc. while state remains single-route and local-first.

## Rules

1. Keep state as local as possible.
2. Persist only user-specific learning state, not static seed data.
3. Add versioned migrations before making incompatible localStorage shape changes.
4. Only promote to a global store when state must survive route boundaries or be shared by distant trees.
5. Keep research snapshots out of app runtime state.

## Anti-patterns

- Global store for single-screen filters.
- Duplicating derived counts in state.
- Persisting raw target-site payloads as app state.
- Writing user learning state into static source files or generated Pages output.
