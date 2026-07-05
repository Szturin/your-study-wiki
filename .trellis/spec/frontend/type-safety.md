# Type Safety

## Core Principle

The UI should depend on **project-owned domain contracts**, not on competitor or import-source field names.

## Rules

### 1. Define domain interfaces centrally

`src/types/study-wall.ts` contains the canonical UI model:

- `SubjectId`
- `SubjectWiki`
- `ChapterNode`
- `KnowledgeNode`
- `TypeGroup`
- `QuestionEntry`
- `LastMasteredRecord`
- `StudyWallPersistedState`

### 2. Prefer literal unions over free-form strings

Current examples:

- `SubjectId`
- `TypeDifficulty`
- `MasteryState`

### 3. Type screen boundaries explicitly

`StudyWallDashboard` accepts `readonly SubjectWiki[]`.

### 4. Validate unknown data at boundaries

Treat localStorage, external JSON, OCR output, and research snapshots as `unknown` until narrowed. Sanitize persisted state by schema version, valid ids, and literal unions before using it.

### 5. Keep raw research payloads outside UI types

If we parse target-site JSON or imported document output, add an adapter layer in `src/lib/` instead of widening UI types to match every raw field.

## Anti-patterns

- `any`.
- Casting localStorage or network payloads directly into UI types without validation.
- Passing `unknown` through several component layers without narrowing.
- UI components reading raw `/api/...` response shapes directly.
