# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`MYCLI.md` in the repo root carries a longer, more exhaustive tour of modules and file paths — consult it when you need a directory-level map. This file covers only what isn't obvious from browsing.

## What this repo is

`mycli` is a fork of Claude Code reconstructed from public source maps, then rebranded. It is **not a pristine upstream checkout**. Some modules are shims or fallbacks because source maps can't recover:
- type-only files, build-time-generated files
- private package wrappers and native bindings
- dynamic imports and asset files

When you run into something that looks broken or stub-like, check `shims/` and `vendor/` before assuming it's a bug — it may be an intentional restoration fallback. Prefer minimal, auditable changes near these areas.

## Commands

Bun is required (>= 1.3.5, pinned via `packageManager`). Node >= 24.

| Command | Purpose |
|---------|---------|
| `bun install` | Install deps + local shim packages from `shims/` |
| `bun run dev` | Interactive CLI via the real bootstrap path (`src/bootstrap-entry.ts` → `src/entrypoints/cli.tsx` → `src/main.tsx`) |
| `bun run start` | Alias for `dev` |
| `bun run version` | Boot smoke test — prints version and exits |
| `bun run dev:restore-check` | Runs `src/dev-entry.ts`, which scans for missing relative imports before forwarding to the CLI. Use this when restoration work may have left dangling imports. |
| `bun link` / `bun unlink` | Install/remove the global `mycli` binary (see `bin/mycli`) |

There is **no lint, no test script, and no CI** configured. Validate changes by booting the affected flow manually (`bun run dev`, exercise the command/tool you touched).

Run with an alternate provider/model without editing settings:
```bash
bun run dev --settings '{"provider":"github-copilot"}' --model claude-sonnet-4.6
```

## Big-picture architecture

### Boot sequence
1. `bin/mycli` (bash) → resolves repo root, execs `bun src/bootstrap-entry.ts` while preserving the caller's cwd.
2. `src/bootstrap-entry.ts` → `ensureBootstrapMacro()` then imports `src/entrypoints/cli.tsx`.
3. `src/entrypoints/cli.tsx` → handles fast-path flags (`--version`, `--dump-system-prompt`) before loading the heavy `src/main.tsx`.
4. `src/main.tsx` → Commander.js wiring, arg parsing, REPL/TUI launch. This file is very large (~800 KB); grep before opening it.
5. `src/entrypoints/init.ts` → runs early: config, env var application, telemetry.

### Agent loop and tools
- `src/query.ts` + `src/QueryEngine.ts` implement the streaming LLM loop, tool dispatch, and context-window management. Most "how does the agent actually work" questions land here.
- Tools implement the interface in `src/Tool.ts` and are registered in `src/tools.ts`. Individual tool implementations live in `src/tools/`. Tool results render as React components under `src/components/messages/`.
- Slash commands live in `src/commands/` and are registered in `src/commands.ts`. Command inclusion can be feature-flag gated.

### TUI
- Ink (React for terminals). Components in `src/components/`, global state in `src/state/` (`AppState.tsx`, `AppStateStore.ts`).
- Keybindings: `src/keybindings/` wired through Ink events.

### API providers
`src/services/api/`:
- `mycli.ts` — Anthropic messages-streaming client (default).
- `openaiCompatibleClient.ts` — OpenAI-compatible adapter, used by `github-models` and some Copilot flows.

Supported providers: `anthropic` (default), `github-models`, `github-copilot`. Copilot-hosted GPT/Grok models **are not wired in** — they need the `/responses` API and the adapter today is chat/messages only. Copilot-hosted Claude models work end-to-end.

### Auth (important — OAuth was removed)
Auth is **settings.json only**. The OAuth flow, macOS keychain lookup, env-var discovery, and interactive login have all been removed. `~/.mycli/settings.json` is the only source:
```json
{ "apiKey": "sk-...", "baseUrl": "https://api.anthropic.com", "model": "claude-sonnet-4-6" }
```
`apiKey` is sent as `Authorization: Bearer <value>` every request. Do not add code paths that try to restore OAuth, keychain, or `ANTHROPIC_API_KEY` env-var discovery unless the user explicitly asks.

For GitHub providers, token lookup order is: provider-specific env var → `GH_TOKEN` → `GITHUB_TOKEN` → `gh auth token`.

### Settings
- Global: `~/.mycli/settings.json`
- Project: `.mycli/settings.local.json` at the project root
- Schema/loading: `src/utils/settings/`

### MCP, bridge, skills, tasks
These are self-contained subsystems — look here first when work is scoped to one:
- MCP: `src/services/mcp/` (client, config, OAuth for MCP servers, connection manager UI)
- IDE bridge: `src/bridge/` (bridgeMain, replBridge, sessionRunner, remoteBridgeCore)
- Skills: `src/skills/` — bundled skills in `src/skills/bundled/`, user skills loaded from `~/.mycli/skills/`, exposed to the model via `SkillTool`
- Background tasks: `src/tasks/` (LocalShellTask, LocalAgentTask, RemoteAgentTask, MonitorMcpTask)

### Feature flags
`feature()` is a **Bun bundler macro** (from `bun:bundle`). Conditional `require()` calls guarded by `feature(FLAG)` get dead-code-eliminated in external builds. Flags seen in-tree include `BRIDGE_MODE`, `KAIROS`, `PROACTIVE`, `VOICE_MODE`, `AGENT_TRIGGERS`. If you add a feature-flagged require, mirror the existing pattern — don't replace it with a plain conditional import.

## Restoration constraints

- `shims/` holds stand-ins for private Anthropic packages and NAPI native modules (`image-processor-napi`, `audio-capture-napi`, `color-diff-napi`, `modifiers-napi`, `url-handler-napi`, `ant-computer-use-*`, `ant-mycli-for-chrome-mcp`). Consumers of these get structured fallback responses, not real behavior.
- `src/native-ts/` contains TypeScript re-implementations of some native modules (`color-diff`, `file-index`, `yoga-layout`).
- `vendor/` holds partial source for native modules (e.g. `image-processor-src`).
- Some import blocks carry `// biome-ignore-all assist/source/organizeImports` or `// ANT-ONLY import markers must not be reordered` — **do not reorder these imports**, ordering is load-bearing.

## Code style

TypeScript + ESM, `react-jsx`. Many files omit semicolons and use single quotes — match the surrounding file exactly rather than imposing a project-wide style. Naming: `camelCase` for vars/functions, `PascalCase` for React components and manager classes, `kebab-case` for command folders (e.g. `src/commands/install-slack-app/`).
