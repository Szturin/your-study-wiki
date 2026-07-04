# Frontend Development Guidelines

> Project-specific frontend conventions for Study Wiki Wall.

---

## Stack Summary

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4

This project is a **server-first web app** with a small number of focused client entry points.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | Filled |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | Filled |
| [State Management](./state-management.md) | Local state, global state, server state | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Filled |
| [Type Safety](./type-safety.md) | Type patterns, validation | Filled |

---

## Current Architecture in One Screen

1. `src/app/page.tsx` stays small and server-first.
2. `src/components/dashboard/study-wall-dashboard.tsx` is the main interactive screen module.
3. `src/hooks/use-study-wall-dashboard.ts` owns screen state and derived filtering.
4. `src/types/study-wall.ts` defines UI-facing domain contracts.
5. `src/lib/mock-study-wall.ts` provides seed data without importing target-site raw shapes.
6. `scripts/fetch-target-site-snapshot.mjs` is research-only and must not be imported into app code.

---

**Language**: Trellis specs stay in English even though product copy may be Chinese.
