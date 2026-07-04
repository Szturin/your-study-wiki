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
