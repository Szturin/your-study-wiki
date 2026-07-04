# Type Safety

## Core Principle

The UI should depend on **our own domain contracts**, not on competitor field names.

## Rules

### 1. Define domain interfaces centrally

`src/types/study-wall.ts` contains the canonical UI model:

- `SubjectTrack`
- `StudyPaper`
- `StudyQuestion`
- `KnowledgeTopic`
- `ProductPillar`
- `TargetSiteFinding`

### 2. Prefer literal unions over free-form strings

Examples from `src/types/study-wall.ts`:

- `MasteryLevel`
- `TrackStatus`
- `QuestionKind`
- `DifficultyLevel`

### 3. Type the screen boundary explicitly

`StudyWallDashboard` accepts typed props instead of `any`.

**Example:** `src/components/dashboard/study-wall-dashboard.tsx`

### 4. Keep raw research payloads outside UI types

If we later parse target-site JSON, add an adapter layer in `src/lib/` instead of widening UI types to match every raw field.

**Related files:**
- `src/lib/mock-study-wall.ts`
- `scripts/fetch-target-site-snapshot.mjs`

## Anti-patterns

- `any`
- `unknown` passed through several component layers without narrowing
- UI components reading raw `/api/...` response shapes directly
