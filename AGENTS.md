<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

Use the `/trellis:start` command when starting a new session to:
- Initialize your developer identity
- Understand current project context
- Read relevant guidelines

Use `@/.trellis/` to learn:
- Development workflow (`workflow.md`)
- Project structure guidelines (`spec/`)
- Developer workspace (`workspace/`)

Keep this managed block so 'trellis update' can refresh the instructions.

<!-- TRELLIS:END -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses the modern App Router stack. Read the relevant guide in `node_modules/next/dist/docs/` before writing code, and prefer server-first patterns unless interactivity is required.
<!-- END:nextjs-agent-rules -->

## Project Guardrails

- Start by reading `CLAUDE.md` and `.trellis/spec/frontend/index.md`; use `.trellis/scripts/get_context.py` when you need the current Trellis session state.
- Keep `src/app/page.tsx` and `src/app/layout.tsx` server-first. Browser APIs, timers, drag/zoom logic, and localStorage belong in client components or hooks.
- This site is statically exported for GitHub Pages. For Pages work, build with `NEXT_PUBLIC_BASE_PATH=/your-study-wiki npm run build`, then run `npm run sync:pages` to mirror `out/` into the repository root.
- User learning data is local-first browser state. Do not move mastery, wrongbook, favorite, or last-mastered state to shared/static files, and do not introduce server writes without an explicit product decision.
- Keep clean-room boundaries: research snapshots stay in `research/`, `docs/research/`, or `scripts/`; app code must use project-owned domain types and adapted seed data.
- Before handing off meaningful frontend changes, run `npm run lint`, `npm run typecheck`, and the static export build. For visual/interaction changes, also verify the local page in a browser.
