# Component Guidelines

## Core Pattern

This project uses a **server-first shell + focused client workbench** pattern.

## Rules

### 1. Route component = composition layer

`src/app/page.tsx` composes the page from data + a single screen component.

```tsx
<StudyWallDashboard
  tracks={subjectTracks}
  pillars={productPillars}
  findings={targetSiteFindings}
/>
```

### 2. One client entry per screen when possible

Complex filtering, search, and local UI coordination should be centralized in one screen-level client component before splitting further.

**Example:** `src/components/dashboard/study-wall-dashboard.tsx`

This avoids prop drilling across many tiny components during the early product phase.

### 3. Small presentational shells stay dumb

`SectionCard` is a good pattern: visual wrapper, typed props, no business state.

**Example:** `src/components/ui/section-card.tsx`

### 4. Props should use domain types, not loose objects

Screen components should receive typed arrays such as `readonly SubjectTrack[]` rather than `any[]` or raw API blobs.

**Examples:**
- `src/components/dashboard/study-wall-dashboard.tsx`
- `src/types/study-wall.ts`

## Anti-patterns

- Adding `"use client"` to every component by default
- Fetching or scraping inside presentational components
- Passing untyped dictionaries like `Record<string, unknown>` when a domain interface exists
- Copying the target site's DOM structure one-to-one
