# Component Guidelines

## Core Pattern

This project uses a **server-first shell + focused client workbench** pattern.

## Rules

### 1. Route component = composition layer

`src/app/page.tsx` composes project-owned data with the interactive dashboard.

```tsx
<StudyWallDashboard subjects={subjectWikis} />
```

### 2. Keep client boundaries intentional

Use Client Components for state, event handlers, browser APIs, drag/zoom interactions, PWA registration, and localStorage. Keep route files and static composition as Server Components.

### 3. Split by stable product domains, not by tiny JSX fragments

`StudyWallDashboard` may remain the main workbench entry, but large standalone domains should be extracted once they have their own state and rendering model.

Current examples:

- `study-wall-dashboard.tsx` owns the learning workbench, wrongbook, favorite book, startup animation, and mind-map view.
- `signal-algorithm-lab.tsx` owns the signal transform demonstration surface.

### 4. Small presentational shells stay dumb

Reusable UI helpers should have typed props and no business state.

Current examples:

- `src/components/ui/section-card.tsx`
- `src/components/ui/math-markdown.tsx`

### 5. Props should use domain types, not loose objects

Screen components should receive typed arrays such as `readonly SubjectWiki[]`, not `any[]` or raw API blobs.

## Anti-patterns

- Adding `"use client"` to every component by default.
- Fetching, scraping, or parsing research snapshots inside presentational components.
- Passing untyped dictionaries when a domain interface exists.
- Copying a target site's DOM structure, naming, or visual identity one-to-one.
