# MYCLI.md

This file provides guidance to My CLI (my-cli.dev) when working with code in this repository.

## Project Overview

My CLI is a Rust implementation of the `my-cli` CLI agent harness. The canonical implementation lives in `rust/`, and this is a public demonstration of autonomous software development coordinated through clawhip, oh-my-codex, and oh-my-openagent.

**Key principle:** This codebase was built by autonomous agents coordinating through Discord. Humans provide direction; claws execute, test, and push. The code is evidence; the coordination system is the product lesson.

## Build and Verification

All commands run from `rust/`:

```bash
# Build the workspace
cargo build --workspace

# Run verification suite
cargo fmt
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace

# Health check after build
./target/debug/my-cli doctor
```

## Running the CLI

```bash
# Interactive REPL
./target/debug/my-cli

# One-shot prompt
./target/debug/my-cli prompt "explain this codebase"

# Resume latest session
./target/debug/my-cli --resume latest

# JSON output for automation
./target/debug/my-cli --output-format json prompt "status"
```

## Configuration

Everything — credentials, provider routing, base URLs — goes in `.mycli/settings.json`. Nothing needs to be `export`ed to the shell.

### Anthropic (first-class)

```json
{
  "anthropic": {
    "apiKey": "sk-ant-..."
  }
}
```

`sk-ant-*` keys go in `apiKey`; OAuth bearer tokens go in `authToken`. Startup fails only when **both** are absent and the selected model is Anthropic.

### Any other provider — use the `env` block

At startup, every string entry under `env` is projected into the process environment before provider clients initialize. That's the knob for OpenAI, OpenRouter, Ollama, xAI, DashScope, proxies, anything. Examples:

**OpenRouter (via OpenAI-compat protocol):**
```json
{
  "model": "openai/gpt-4.1-mini",
  "env": {
    "OPENAI_API_KEY": "sk-or-v1-...",
    "OPENAI_BASE_URL": "https://openrouter.ai/api/v1"
  }
}
```

**Local Ollama (no key):**
```json
{
  "model": "llama3.2",
  "env": {
    "OPENAI_BASE_URL": "http://127.0.0.1:11434/v1"
  }
}
```

**xAI Grok:**
```json
{
  "model": "grok-3",
  "env": {
    "XAI_API_KEY": "xai-..."
  }
}
```

**Alibaba DashScope (Qwen):**
```json
{
  "model": "qwen-plus",
  "env": {
    "DASHSCOPE_API_KEY": "sk-..."
  }
}
```

**Corporate proxy in front of Anthropic:**
```json
{
  "anthropic": {"authToken": "proxy-bearer-..."},
  "env": {
    "ANTHROPIC_BASE_URL": "https://your-proxy.corp/v1"
  }
}
```

## Architecture

### Workspace Structure

- **`rust/crates/api/`** — Provider clients (Anthropic/OpenAI-compat), SSE streaming, auth, request building
- **`rust/crates/runtime/`** — Core conversation loop, session persistence, permissions, MCP lifecycle, config loading, system prompt assembly
- **`rust/crates/my-cli/`** — Main CLI binary (`my-cli`), REPL, argument parsing, terminal rendering
- **`rust/crates/tools/`** — Built-in tool specs and execution (Bash, Read, Write, Edit, Grep, Glob, WebSearch, WebFetch, Agent, Skill, etc.)
- **`rust/crates/commands/`** — Slash command definitions, parsing, help text, JSON rendering
- **`rust/crates/plugins/`** — Plugin metadata, install/enable/disable flows, hook integration
- **`rust/crates/mock-upstream-service/`** — Deterministic `/v1/messages` mock for parity testing
- **`rust/crates/telemetry/`** — Session trace events and usage telemetry
- **`rust/crates/compat-harness/`** — Extracts tool/prompt manifests from upstream TypeScript source

### Key Runtime Components

**ConversationRuntime** (`runtime/src/conversation.rs`):
- Drives the turn loop: assemble request → stream response → execute tools → repeat
- Handles auto-compaction when input tokens exceed threshold (default 100K, configurable via `CLAUDE_CODE_AUTO_COMPACT_INPUT_TOKENS`)
- Emits `AssistantEvent` stream (TextDelta, ToolUse, Usage, PromptCache, MessageStop)

**Session** (`runtime/src/session.rs`):
- Persists conversation history to `.mycli/sessions/*.jsonl`
- Supports resume via `--resume latest` or `--resume <session-id>`

**PermissionPolicy** (`runtime/src/permissions.rs`):
- Enforces permission modes: `read-only`, `workspace-write`, `danger-full-access`
- Validates tool calls against allowlists and mode restrictions
- Prompts user for approval when tool requires escalation

**ConfigLoader** (`runtime/src/config.rs`):
- Loads config hierarchy: `~/.mycli/settings.json` (overridable via `MYCLI_CONFIG_HOME`) → `<repo>/.mycli/settings.json`
- Later entries override earlier ones

**McpServerManager** (`runtime/src/mcp_server.rs`):
- Manages MCP server lifecycle (stdio, WebSocket, remote, SDK transports)
- Bridges MCP tools into the runtime tool registry

## Mock Parity Harness

Deterministic end-to-end testing against a local Anthropic-compatible mock:

```bash
cd rust
./scripts/run_mock_parity_harness.sh
```

Scenarios covered: streaming text, file tools (read/write/grep), bash execution, permission prompts, multi-tool turns, plugin tools. See `rust/crates/my-cli/tests/mock_parity_harness.rs` and `rust/mock_parity_scenarios.json`.

## Model Aliases

Short names resolve to latest versions:
- `opus` → `claude-opus-4-6`
- `sonnet` → `claude-sonnet-4-6`
- `haiku` → `claude-haiku-4-5-20251213`

Default model: `claude-opus-4-6`

## Permission Modes

- `read-only` — Read files, grep, glob only
- `workspace-write` — Add file writes/edits within workspace
- `danger-full-access` — Allow bash, external commands, destructive operations (default)

## Config Files

Keep shared defaults in `<repo>/.mycli/settings.json`. User-level defaults live in `~/.mycli/settings.json` (override the directory with `MYCLI_CONFIG_HOME`). No other config files are loaded. Never commit API keys or tokens.

## Development Workflow

1. Make changes in `rust/crates/*`
2. Run `cargo fmt` before committing
3. Ensure `cargo clippy --workspace --all-targets -- -D warnings` passes
4. Run `cargo test --workspace` to verify behavior
5. Test CLI changes with `./target/debug/my-cli doctor` and manual REPL runs
6. For tool changes, update both `tools/src/lib.rs` and corresponding runtime modules

## Parity Status

See `PARITY.md` for detailed Rust port status. All 9 requested lanes are merged on `main`. Mock parity harness validates core flows. Some upstream features remain branch-only or approximated (e.g., full bash validation submodules).

## Documentation Map

- `USAGE.md` — Task-oriented usage guide with copy/paste examples
- `rust/README.md` — Crate map, features, CLI surface, stats
- `PARITY.md` — Rust port parity status and lane details
- `PHILOSOPHY.md` — Why this project exists and how it's operated
- `ROADMAP.md` — Active roadmap and cleanup backlog

## Important Notes

- **Do not use `cargo install my-cli`** — it installs a deprecated stub. Build from source.
- Binary name is `my-cli` (or `my-cli.exe` on Windows), not `my-cli`.
- Sessions persist under `.mycli/sessions/` in the current workspace.
- Slash commands in REPL: `/help`, `/status`, `/doctor`, `/mcp`, `/agents`, `/skills`, `/plugin`, `/config`, `/cost`, `/resume`, etc.
- Windows: Use `.\target\debug\my-cli.exe` and PowerShell `$env:ANTHROPIC_API_KEY = "..."` for env vars.
