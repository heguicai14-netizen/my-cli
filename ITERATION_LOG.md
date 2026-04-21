# 迭代日志 — my-cli 从 Rust 版本继承的产品需求

本文件记录在 Rust 版本(覆盖为 TypeScript `claude-code-rev` 之前)上迭代的所有产品需求。
覆盖后,这些需求需要在新代码库(TypeScript / Bun)上重新实现一遍。

---

## 总览

| # | 需求 | 状态(Rust 版) | Git commit |
|---|---|---|---|
| 1 | 配置文件只加载 `.mycli/settings.json`,废弃 `.claw.json` 等历史路径 | ✅ | `e252996` |
| 2 | Anthropic 凭证支持写入 `settings.json`(不强制 env var) | ✅ | `0ccb423` |
| 3 | 文件名把 `anthropic` 改成 `upstream`(仅路径层,类型名保留) | ✅ | `a53d590` |
| 4 | 用户可见字符串从 `claw` / `Claw Code` 重命名为 `my-cli` / `My CLI` | ✅ | `d902634` |
| 5 | `CLAW_CONFIG_HOME` 环境变量改名为 `MYCLI_CONFIG_HOME` | ✅ | `d902634`(同上) |
| 6 | `settings.json` 的 `env` 块在启动时自动注入进程环境 | ✅ | `b621adc` |
| 7 | OpenAI-compat 路径加默认 `User-Agent` header | ✅ | `fc247af` |
| 8 | 新增 `requestHeaders` 顶层配置,所有出站请求附加自定义 header | ✅ | `fc247af`(同上) |
| 9 | 还原 env var 认证,优先级为 env → config → error | ✅ | `32c9d67` |

---

## 迭代 1 — 配置文件只加载 `.mycli/settings.json`

**需求原话**:"配置文件除仓库内部的文件,只加载 .mycli 文件夹内部的。.mycli/settings.json"

**确认后的具体行为(用户选择的):**
- 继续加载 `~/.mycli/settings.json`(用户级)
- 只加载项目级 `.mycli/settings.json`(不读 `.mycli/settings.local.json`)
- 丢弃所有历史文件:`.mycli.json`、`.claw.json`、`.mycli-legacy.json`、`~/.config/claw/settings.json`、`~/.mycli.json` 等

**最终加载链(优先级由低到高):**
1. `{CLAW_CONFIG_HOME}/settings.json`(默认 `~/.mycli/settings.json`) — `ConfigSource::User`
2. `<repo>/.mycli/settings.json` — `ConfigSource::Project`

**Rust 实现点(可作为 TS 版参考):**
- `ConfigLoader::discover()` 返回两条路径
- 移除了对 `.mycli.json` 的 legacy 静默处理(以前解析失败直接忽略)
- `/config` 编辑器把写入目标从 `settings.local.json` 改成 `settings.json`
- `init` 子命令生成 `.mycli/settings.json` 而不是 `.mycli.json`
- 文档同步:README / USAGE / MYCLI

---

## 迭代 2 — Anthropic 凭证支持写入 `settings.json`

**需求原话**:"不再依赖 ANTHROPIC_API_KEY、ANTHROPIC_AUTH_TOKEN;直接读配置文件即可"

**支持的配置形态:**
```json
{
  "anthropic": {
    "apiKey": "sk-ant-...",
    "authToken": "bearer-token"
  }
}
```

**解析优先级**(最终形态,见迭代 9):
1. `ANTHROPIC_API_KEY` env → 若为空
2. `anthropic.apiKey` config → 若为空
3. `ANTHROPIC_AUTH_TOKEN` env → 若为空
4. `anthropic.authToken` config → 若全为空
5. 报 `MissingCredentials` 错误,错误消息同时提示 env var **和** settings.json 两种来源

**TS 版实现要点:**
- Schema 新增 `anthropic: { apiKey?: string, authToken?: string }` 顶层块
- Startup auth 解析先读 env,再 fallback 到 config
- `/doctor` 同时显示 env 和 settings.json 两边的凭证是否存在

---

## 迭代 3 — 文件名 `anthropic` → `upstream`

**需求原话**:"项目里 anthropic 文件名也需要重命名",改成 `upstream`(中性),**只改文件名,代码里的类型名保留**。

**Rust 版的改动:**
- `rust/crates/api/src/providers/anthropic.rs` → `upstream.rs`
- `rust/crates/mock-anthropic-service/` → `mock-upstream-service/`
- Cargo crate 名、`[[bin]]` 名、依赖声明同步更新
- 类型名保留:`AnthropicClient`、`ProviderKind::Anthropic`、`AnthropicConfigCredentials`、`MockAnthropicService`、`anthropic.apiKey`、`ANTHROPIC_API_KEY` env var 等(这些描述的是"对接的是 Anthropic API",不是"我们项目叫 anthropic")

**TS 版:** 可类比。把 `src/` 里叫 `anthropic*` 的**文件/目录**重命名为 `upstream*`,但 class / function / type 名保留。

---

## 迭代 4 — 品牌从 `claw` / `Claw Code` 改为 `my-cli` / `My CLI`

**需求原话**:"项目更名为 my-cli"

**范围(用户选:"只改用户可见的"):**
- CLI `--help` 输出(`my-cli help`、`my-cli status` 等子命令列表)
- 错误消息(`Start \`my-cli\` and run...`、`my-cli --resume`、`my-cli --help` 等)
- `/doctor`、`/status`、`/config` 的输出文本
- Session 路径提示从 `.claw/sessions/` 改为 `.mycli/sessions/`
- 顶层文档:`README.md`、`USAGE.md`、`MYCLI.md`、`PHILOSOPHY.md`、`PARITY.md`、`rust/README.md`、`rust/MOCK_PARITY_HARNESS.md`
- `cargo run -p rusty-claude-cli` → `cargo run -p my-cli`

**保留不改:**
- 内部类型名(`AnthropicClient` 等)
- `ROADMAP.md`(历史文档,620KB,不触)
- GitHub URL 里的 `ultraworkers/claw-code`(指向外部仓库,不归我们控制)
- 测试函数名等内部标识符

---

## 迭代 5 — `CLAW_CONFIG_HOME` → `MYCLI_CONFIG_HOME`

**需求原话**:"CLAW_CONFIG_HOME 换成 MYCLI_CONFIG_HOME"(旧名直接删除)。

已全局替换,**旧名不做 fallback**。依赖 `CLAW_CONFIG_HOME` 的用户需要改新名。

---

## 迭代 6 — `settings.json` 的 `env` 块自动注入进程环境

**需求原话**:"我的诉求就一个,`~/.mycli/settings.json` 支持配置其他模型,不需要我再做其他的操作"

**Rust 实现(选项 A):**
- `RuntimeConfig::apply_env_vars()`:遍历顶层 `env` 对象里的每个 string 值,调用 `std::env::set_var(key, value)`
- CLI 启动(`run()`)的第一行调用,早于任何 provider client 构造
- 非 string 值静默跳过

**用户价值:** 非 Anthropic provider(OpenAI / OpenRouter / Ollama / xAI / DashScope)的所有 env var 可以都写到 `settings.json` 里:

```json
{
  "model": "openai/gpt-4.1-mini",
  "env": {
    "OPENAI_API_KEY": "sk-or-v1-...",
    "OPENAI_BASE_URL": "https://openrouter.ai/api/v1"
  }
}
```

**TS 版实现要点:** 加载 config 后,遍历 `config.env`,对每个 string 值 `process.env[key] = value`。一定要在任何 provider SDK 初始化之前做。

---

## 迭代 7 — 请求 header 完善

**需求原话**:"需要加的"(确认要补 User-Agent 和 requestHeaders)

### 7.1 OpenAI-compat 路径补 User-Agent

之前 Anthropic 路径有 `user-agent: my-cli/<version>`,OpenAI-compat 路径没送,
会导致某些网关(OpenRouter、企业 gateway、CDN)拒绝无 UA 的请求。现在**两条路径
都发同样的 User-Agent**。

### 7.2 新增 `requestHeaders` 顶层配置

```json
{
  "requestHeaders": {
    "HTTP-Referer": "https://my-cli.dev",
    "X-Title": "my-cli"
  }
}
```

**生效范围:** Anthropic 路径 **和** OpenAI-compat 路径,每个出站请求都附加。

**适用场景:**
- OpenRouter 要求的 `HTTP-Referer` / `X-Title`
- Kimi code-plan 可能要求的 `X-Moonshot-*`
- 企业代理的 tenant 标签

**Schema 规则:**
- 每个值必须是 string,非 string 值在 config 验证时报错
- 空字符串会被静默跳过

---

## 迭代 8 — 还原 `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` env var 认证

**需求原话**:"不能用 ANTHROPIC_API_KEY 吗?"(对之前"不要了"的反转)

**最终的优先级规则(env 赢):**

1. `ANTHROPIC_API_KEY` env
2. `anthropic.apiKey` config
3. `ANTHROPIC_AUTH_TOKEN` env
4. `anthropic.authToken` config
5. 全空 → `MissingCredentials` 错误(错误消息同时提示两种来源)

**`/doctor` 展示格式:**
```
Auth
  Status   ok
  Summary  Anthropic credentials are configured (env wins over settings.json)
  Details
    - Environment       ANTHROPIC_API_KEY=present ANTHROPIC_AUTH_TOKEN=absent
    - settings.json     anthropic.apiKey=present anthropic.authToken=absent
```

---

## 其它辅助上下文

### Kimi Code 作为 Anthropic-compat endpoint 的配置写法

Kimi 官方文档要求:
```bash
export ANTHROPIC_BASE_URL=https://api.kimi.com/coding/
export ANTHROPIC_API_KEY=sk-kimi-...
```

在 my-cli 里三种等价写法:

**A. 直接按官方文档 export**(迭代 8 还原后直接支持):
```bash
export ANTHROPIC_BASE_URL=https://api.kimi.com/coding/
export ANTHROPIC_API_KEY=sk-kimi-...
```

**B. 全部写到 `~/.mycli/settings.json`**(迭代 6 支持):
```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.kimi.com/coding/",
    "ANTHROPIC_API_KEY": "sk-kimi-..."
  }
}
```

**C. 强类型 + env 混合:**
```json
{
  "anthropic": { "apiKey": "sk-kimi-..." },
  "env": { "ANTHROPIC_BASE_URL": "https://api.kimi.com/coding/" }
}
```

### 已知坑:`kimi-*` 模型名默认会路由到 DashScope

Rust 版 `providers/mod.rs::metadata_for_model` 对 `kimi/` / `kimi-` 前缀硬编码路由到 DashScope(阿里通义的 Kimi),需要 `DASHSCOPE_API_KEY`。

用户如果用 Kimi Code(Anthropic-compat 路径),应该:
- 要么把 `model` 改成 Anthropic 名(`sonnet` / `claude-sonnet-4-*`)
- 要么用 `aliases` 映射:`"aliases": {"kimi-for-coding": "claude-sonnet-4-6"}`

**TS 版应避免这个硬编码。** 更合理的行为:如果用户已设 `ANTHROPIC_BASE_URL`,把 `kimi-*` 当作用户主动指定的 Anthropic-compat 模型处理,不自动分走 DashScope。

---

## 测试覆盖(Rust 版累计)

每个迭代附带的单元测试(覆盖率参考,TS 版应重新写):
- 迭代 1: `loads_and_merges_claude_code_config_files_by_precedence`(2 文件加载) + 若干 local/project 合并场景
- 迭代 2: `parses_anthropic_credentials_from_settings`、`anthropic_credentials_default_empty_when_unset`、`resolve_startup_auth_source_with_config_*` 系列
- 迭代 6: `apply_env_vars_projects_string_entries_into_process_environment`、`apply_env_vars_is_noop_when_env_object_missing`
- 迭代 7: `parses_request_headers_from_settings`、`request_headers_rejects_non_string_values`
- 迭代 8: `resolve_startup_auth_source_with_config_prefers_env_over_config_api_key`、`resolve_startup_auth_source_with_config_errors_when_both_env_and_config_are_empty`

---

## 重做顺序建议

在新(TypeScript)代码库上按这个顺序复刻会最顺畅:

1. **先复刻迭代 1**:锁定 config 加载只认 `.mycli/settings.json`
2. **迭代 6**:`env` 块注入进程环境 — 这是基础设施,其它依赖它
3. **迭代 2 + 迭代 8**:Anthropic 凭证的 env + config 双来源解析
4. **迭代 7**:User-Agent + `requestHeaders`
5. **迭代 4 + 迭代 5**:品牌重命名 + env var 重命名(纯字符串改动,放最后批量做最稳)
6. **迭代 3**:文件/目录重命名(`anthropic*` → `upstream*`,只改文件名)

---

## 覆盖前的原 Rust 代码保留方式

覆盖 TypeScript 代码之前,**已打 git tag**:
```
backup-rust-before-ts-overlay
```

任何时候想回去看原 Rust 实现:
```bash
git checkout backup-rust-before-ts-overlay
# 或 git diff backup-rust-before-ts-overlay master -- path/to/file
```

---

生成时间:本次 session 结束时(见 git 历史对应 commit 时间戳)。
