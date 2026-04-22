# MYCLI.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`mycli` is a restored fork of Claude Code reconstructed from public source maps. It is a CLI tool that provides an interactive AI-powered coding assistant built with React and Ink (terminal UI). The codebase is TypeScript-first, ESM-only, and runs on Bun.

## Development Environment

- **Package manager**: Bun >= 1.3.5 (required, specified in `packageManager`)
- **Runtime**: Node.js >= 24.0.0 or Bun
- **No test suite**: There is no consolidated test suite, lint script, or CI configured yet.

## Common Commands

| Command | Purpose |
|---------|---------|
| `bun install` | Install dependencies and local shim packages |
| `bun run dev` | Start the interactive CLI (alias: `bun run start`) |
| `bun run version` | Quick smoke test — prints version if CLI boots |
| `bun run dev:restore-check` | Run the dev-entry checker (scans for missing relative imports) |
| `bun link` | Globally link `mycli` command |

To run the CLI with a specific provider or model:
```bash
bun run dev --settings '{"provider":"github-copilot"}' --model claude-sonnet-4.6
```

## Architecture

### Entry Points and Boot Sequence

1. `bin/mycli` — Bash launcher that resolves the repo root and invokes `bun src/bootstrap-entry.ts`
2. `src/bootstrap-entry.ts` — Calls `ensureBootstrapMacro()` then imports `src/entrypoints/cli.tsx`
3. `src/entrypoints/cli.tsx` — Handles fast-path flags (`--version`, `--dump-system-prompt`), then loads `src/main.tsx`
4. `src/main.tsx` — Main interactive entry; sets up Commander.js CLI, parses args, and launches the REPL/TUI
5. `src/entrypoints/init.ts` — `init()` function called early; enables configs, applies env vars, initializes telemetry

`src/dev-entry.ts` is a restoration helper that scans for missing relative imports before forwarding to `entrypoints/cli.tsx`. It is used by `bun run dev:restore-check`.

### TUI and State

- **Renderer**: Ink (React for terminals). Components live in `src/components/`. State is managed in `src/state/` (`AppState.tsx`, `AppStateStore.ts`).
- **Keybindings**: Custom keybinding system in `src/keybindings/`, wired through Ink events.
- **Main loop**: `src/query.ts` and `src/QueryEngine.ts` implement the agent loop — streaming LLM responses, dispatching tool calls, and managing context windows.

### Tool System

Tools are defined in `src/tools/` and registered in `src/tools.ts`. Each tool implements the `Tool` interface from `src/Tool.ts`. Key built-in tools:

- `BashTool`, `FileReadTool`, `FileEditTool`, `FileWriteTool`, `GlobTool`, `GrepTool`
- `AskUserQuestionTool` — interactive user prompts
- `EnterPlanModeTool` / `ExitPlanModeTool` — plan mode gating
- `EnterWorktreeTool` / `ExitWorktreeTool` — git worktree isolation
- `TaskCreateTool`, `TaskListTool`, `TaskGetTool`, `TaskUpdateTool`, `TaskStopTool` — background task management
- `SkillTool` — invoke user-defined or bundled skills
- `WebFetchTool`, `WebSearchTool`
- `MCPTool` — Model Context Protocol servers

Tool results are rendered as React components in `src/components/messages/`.

### Commands (Slash Commands)

User-facing slash commands are implemented in `src/commands/` and registered in `src/commands.ts`. Each command typically exports a `Command` object with metadata and an `execute` function. The command registry supports conditional inclusion via feature flags.

### MCP Support

MCP (Model Context Protocol) integration lives in `src/services/mcp/`:
- `client.ts` — MCP client implementation
- `config.ts` — Server configuration persistence
- `auth.ts` — OAuth flow for MCP servers
- `useManageMCPConnections.ts` — React hook for connection lifecycle
- `MCPConnectionManager.tsx` — UI component for managing connections

### Bridge Mode

`src/bridge/` implements the IDE bridge protocol (e.g., VS Code extension communication). Key files:
- `bridgeMain.ts` — Core bridge logic
- `replBridge.ts` — REPL transport over bridge
- `sessionRunner.ts` — Remote session execution
- `remoteBridgeCore.ts` — WebSocket/long-polling transport

### Skills

Skills are user-invokable capabilities defined in `src/skills/`:
- `src/skills/bundled/` — Built-in skills (e.g., `mycli-api`, `verify`, `loop`, `simplify`)
- `src/skills/loadSkillsDir.ts` — Loads user skills from `~/.mycli/skills/`
- Skills are exposed to the model as tools via `SkillTool`

### API and Providers

API communication is in `src/services/api/`:
- `mycli.ts` — Main Anthropic API client (messages streaming)
- `openaiCompatibleClient.ts` — OpenAI-compatible provider adapter
- `client.ts` — Request/response interceptors and retries
- `errors.ts` — API error classification and handling

Supported providers: `anthropic` (default), `github-models`, `github-copilot`. Provider selection is stored in `~/.mycli/settings.json` or passed via `--settings`.

### Authentication

Auth is **settings.json-only**. The OAuth/keychain auth module has been removed. Minimal config in `~/.mycli/settings.json`:
```json
{
  "apiKey": "sk-...",
  "baseUrl": "https://api.anthropic.com",
  "model": "claude-sonnet-4-6"
}
```

For GitHub providers, auth is resolved from provider-specific env vars → `GH_TOKEN` → `GITHUB_TOKEN` → `gh auth token`.

### Configuration

Settings schema and validation: `src/utils/settings/`:
- `settings.ts` — Core settings logic
- `types.ts` — Settings TypeScript types
- `changeDetector.ts` — Watches `settings.json` for changes
- `managedEnv.ts` — Applies settings as environment variables

Global settings: `~/.mycli/settings.json`
Project settings: `.mycli/settings.local.json` (in project root)

### Feature Flags

Feature flags are gated via `feature()` from `bun:bundle` (a Bun bundler macro). Flags include `BRIDGE_MODE`, `KAIROS`, `PROACTIVE`, `VOICE_MODE`, `AGENT_TRIGGERS`, etc. Conditionally imported code uses `require()` guarded by `feature(...)` — these blocks are dead-code-eliminated in external builds.

### Shims and Restoration

This is a reconstructed source tree. Native/private packages that could not be fully restored are replaced with shims in `shims/`:
- `ant-computer-use-mcp`, `ant-computer-use-input`, `ant-computer-use-swift`
- `image-processor-napi`, `audio-capture-napi`, `color-diff-napi`, `modifiers-napi`, `url-handler-napi`
- `ant-mycli-for-chrome-mcp`

Vendor source for some native modules: `vendor/` (e.g., `image-processor-src`).

When modifying code near a shim, prefer minimal changes and document any workaround.

### Native TypeScript Modules

`src/native-ts/` contains TypeScript implementations of native modules:
- `color-diff/` — Color difference algorithms
- `file-index/` — File indexing utilities
- `yoga-layout/` — CSS Flexbox layout engine bindings

### Tasks and Background Work

Background tasks are managed via the task system in `src/tasks/`:
- `LocalShellTask` — Shell command execution
- `LocalAgentTask` — Local agent sub-session
- `RemoteAgentTask` — Remote agent execution
- `MonitorMcpTask` — MCP server monitoring

Tasks are created/stopped/queried through the Task tools and rendered in `src/components/tasks/`.

### Code Style

- TypeScript with ESM imports, `react-jsx`
- Many files omit semicolons and use single quotes
- Descriptive `camelCase` for variables/functions, `PascalCase` for React components/classes, `kebab-case` for command folders
- Some import blocks have `// biome-ignore-all assist/source/organizeImports` or `// ANT-ONLY import markers must not be reordered` — do not reorder these imports

## Important Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | Main interactive CLI setup (Commander, flags, REPL launch) |
| `src/query.ts` | Agent loop: stream LLM, handle tool calls, manage context |
| `src/QueryEngine.ts` | Query routing and engine selection |
| `src/Tool.ts` | Core `Tool` interface and tool lookup utilities |
| `src/tools.ts` | Tool registry — all tools are instantiated here |
| `src/commands.ts` | Slash command registry |
| `src/context.ts` | System context / user context builders (git status, memory files) |
| `src/setup.ts` | Session setup (cwd, permissions, worktrees, tmux) |
| `src/entrypoints/cli.tsx` | CLI bootstrap after fast-path flags |
| `src/entrypoints/init.ts` | Early initialization (config, env, telemetry) |
| `src/state/AppState.tsx` | Global React state for the TUI |
| `src/services/api/mycli.ts` | Anthropic API client |
| `src/services/mcp/client.ts` | MCP client |
| `src/bridge/bridgeMain.ts` | IDE bridge protocol |
| `src/utils/settings/settings.ts` | Settings loading and access |
| `src/utils/config.ts` | Project/global config (`.mycli/settings.local.json`) |
