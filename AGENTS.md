# Repository Guidelines

This document is for contributors (humans and LLMs) working on the Blender Gemini Assistant.

## Project Structure & Modules

- Root acts as `src/`: `index.html`, `index.tsx`, `App.tsx`, `types.ts`.
- UI: `components/` (React views), `hooks/` (logic such as `useGeminiAgent`, `useBlender`), `utils/` (prompts, tool schemas).
- Blender bridge and dev tools: `gemini_bridge.py.txt` and `DEVELOPMENT_SUITE/` (sanity scripts, bridge test runner).
- `gemini_bridge.py.txt` is the single source of truth for the Blender addon, including persisted preferences, token generation, and HTTP endpoints.

## Build, Run, and Sanity Checks

- `npm install` – install frontend dependencies.
- `npm run dev` – start Vite dev server.
- `npm run build` – production build (used by deploys and sanity scripts).
- `npm run preview` – preview the built app locally.
- Create `.env.local` with `GEMINI_API_KEY=your_key` (Vite injects it as `process.env.GEMINI_API_KEY`/`API_KEY`).
- Spawn the Gemini addon panel inside Blender and hit **Launch Interface** so the generated `token` query param is captured and stored as `settings.blenderToken`; `useBlender` will send `X-Blender-Token` with every request.
- `bash DEVELOPMENT_SUITE/run_webapp_sanity.sh.txt` – TypeScript/Node sanity check.
- In Blender: run `DEVELOPMENT_SUITE/blender_test_runner.py.txt` in the Text Editor to validate the bridge.

## Coding Style & Naming

- Language: TypeScript + React (Vite). Use functional components, hooks, and `@/*` path aliases.
- Indentation: 2 spaces; keep imports ordered (React, libs, local).
- Naming: PascalCase for components (`ChatPanel.tsx`), camelCase for functions/variables, `useX` for hooks, shared types in `types.ts`.
- Keep the flat layout; prefer small, focused files over deep nesting.
- `settings.blenderToken` stores the secure token from the `token` query parameter; `useBlender` must add it to every backend request.

## Testing & Verification

- There is no JS test runner yet; rely on:
  - `npm run build` and `DEVELOPMENT_SUITE/run_webapp_sanity.sh.txt` for type/build health.
  - `blender_test_runner.py.txt` for bridge/serialization checks.
- When adding tests, prefer Vitest + React Testing Library under a `__tests__/` or `*.test.tsx` pattern.

## Commits & Pull Requests

- Use clear, imperative commit messages; conventional prefixes like `feat:`, `fix:`, `chore:` are encouraged.
- Keep changes scoped (UI, agent logic, or bridge) and reference related docs (README, DEVELOPMENT_SUITE) when behavior changes.
- PRs should include: brief summary, screenshots or GIFs for UI changes, notes on how you manually verified behavior (dev server, sanity scripts, Blender tests), and any migration steps for the bridge (e.g., “reload gemini_bridge in Blender”).
