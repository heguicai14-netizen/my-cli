# Skills 与 Slash Commands

## 1. 模块作用

mycli 把 “用户能输入 `/xxx`” 与 “模型能调用专业指引” 这两条路径合并到同一套 `Command` 抽象上：

- **Slash Command（命令）** 是 CLI 层概念。用户在 REPL 输入 `/init`、`/compact`、`/provider` 等，由 TUI 解析并执行。命令的 `type` 有三种：
  - `local` —— 同步在主进程跑一段 TS 函数（如 `/compact`）。
  - `local-jsx` —— 弹出一个 Ink 的全屏/模态 UI（如 `/provider`、`/model`）。
  - `prompt` —— 把命令体作为一段提示词追加到对话里，让模型继续推理。`/init` 走这条路径。
- **Skill（技能）** 是 Agent 层概念。它本质上是 `type: 'prompt'` 的命令，但通常额外带 `whenToUse`、`hasUserSpecifiedDescription`、`disableModelInvocation` 等字段，由 `SkillTool` 暴露给模型，让模型在自然语言对话中**主动**`Skill({ skill: "verify" })` 触发。

简单地说：命令 ⊃ Skill；Skill 是“**可被模型自主 invoke**的命令”。两者在 `getCommands()` 里是同一个数组，只是 `getSkillToolCommands()` / `getSlashCommandToolSkills()` 进一步过滤出能给 SkillTool 用的那部分（`src/commands.ts:563-608`）。

## 2. 关键文件与职责

| 路径 | 职责 |
| --- | --- |
| `src/commands.ts` | 命令注册中心；`COMMANDS()` 列出所有内建 slash 命令；`getCommands(cwd)` 整合 bundled skills、用户/项目 skills、plugin、workflow；`getSkillToolCommands` 过滤出可被模型 invoke 的子集。|
| `src/types/command.ts` | `Command` 的 union 类型（`local` / `local-jsx` / `prompt`），以及 `getCommandName`、`isCommandEnabled`。|
| `src/utils/slashCommandParsing.ts` | 解析输入字符串：`/xxx args` → `{ commandName, args, isMcp }`。|
| `src/utils/processUserInput/processSlashCommand.tsx` | 命令调度：查 `hasCommand` → 按 `type` 分发到 `local-jsx`、`local`、`prompt` 三条执行路径。|
| `src/commands/<name>/index.ts` | 每个内建命令的 `Command` 对象，描述、`load()` 懒加载实现、`argumentHint` 等。|
| `src/skills/bundledSkills.ts` | `registerBundledSkill()` —— 把内置 skill 注册成 `loadedFrom: 'bundled'` 的 prompt-type 命令，可选 `files` 字段会在首次调用时落盘到一个 nonce 目录。|
| `src/skills/bundled/index.ts` | `initBundledSkills()` —— 启动期统一 register 所有 bundled skill（`update-config`、`verify`、`debug`、`simplify`、`skillify` 等，部分由 feature flag 决定）。|
| `src/skills/loadSkillsDir.ts` | 从磁盘加载 skill：`getSkillDirCommands(cwd)` 并行扫描 managed / user / project / `--add-dir` 四个来源的 `.../skills/<name>/SKILL.md`，外加遗留 `commands/` 目录；用 `realpath` 去重，处理 `paths` frontmatter 做条件激活。|
| `src/tools/SkillTool/SkillTool.ts` | 把 skill 暴露成模型工具；`validateInput` 查表、`checkPermissions` 走 allow/deny 规则、`call` 把 skill 的 prompt 注入对话。|
| `src/tools/DiscoverSkillsTool/` | 在启用远程 skill 搜索时，让模型先 “发现” 再调用。|

## 3. 执行步骤（带 file:line 引用）

### 3.1 启动期：注册 + 收集

1. **bootstrap** 阶段调用 `initBundledSkills()`（`src/skills/bundled/index.ts:24-79`），逐个 `registerBundledSkill({ ... })` 写入内存的 `bundledSkills` 数组（`src/skills/bundledSkills.ts:43-100`）。每个 bundled skill 是一段 markdown + 可选的 `files: Record<path, content>`。
2. 用户首次调用 `getCommands(cwd)`（`src/commands.ts:476-517`）时，`loadAllCommands` 并行触发：
   - `getSkills(cwd)` → `getSkillDirCommands(cwd)`（`src/skills/loadSkillsDir.ts:638-804`）扫描 `~/.mycli/skills/<name>/SKILL.md`、`<project>/.mycli/skills/...`、policy 路径、`--add-dir` 路径；
   - `getBundledSkills()` 取出已注册的；
   - `getPluginCommands()` / `getPluginSkills()` 加载 plugin；
   - `getWorkflowCommands()` 仅在 `WORKFLOW_SCRIPTS` flag 开启时加载。
3. 整体顺序：bundled → builtin-plugin skills → 磁盘 skills → workflow → plugin commands → plugin skills → 最后 `COMMANDS()` 内建 slash 命令（`src/commands.ts:460-468`）。这意味着同名时**前者覆盖后者**的检索顺序由 `findCommand`（`src/commands.ts:688-698`）的 `Array.find` 决定。

### 3.2 用户输入 `/xxx`：解析与分发

1. REPL 收到一行带 `/` 前缀的输入 → `processSlashCommand(inputString, ...)`（`src/utils/processUserInput/processSlashCommand.tsx:309`）。
2. `parseSlashCommand`（`src/utils/slashCommandParsing.ts:25-60`）把字符串拆成 `{ commandName, args, isMcp }`；MCP 命令是空格后跟 `(MCP)` 的特殊形式。
3. `hasCommand(commandName, ...)` 查表（`src/commands.ts:700-702`）。**找不到**有两种处理：
   - 形式像合法命令名（仅 `[a-zA-Z0-9:_-]`，`looksLikeCommand`：`src/utils/processUserInput/processSlashCommand.tsx:304-308`）→ 返回 `Unknown skill: xxx`。
   - 否则当成普通 prompt 直接发给模型（用户其实是在 `/foo bar` 写文件路径的场景）。
4. 找到后 → `getMessagesForSlashCommand`（`src/utils/processUserInput/processSlashCommand.tsx:525`）按 `command.type` 分发：
   - `local-jsx`：调用 `command.load()` → `mod.call(onDone, ctx, args)` 返回 JSX，由 `setToolJSX` 渲染成模态 UI（`processSlashCommand.tsx:551-655`）。
   - `local`：直接 `await mod.call(args, context)` 拿 `result.value` 或 `result.compactionResult`，写入对话（`processSlashCommand.tsx:657-722`）。`/compact` 走这条。
   - `prompt`：调用 `command.getPromptForCommand(args, ctx)` 返回 `ContentBlockParam[]`，作为新一轮 user message 发给模型（`processSlashCommand.tsx:723-760`）。`/init` 走这条。
5. 如果 `command.userInvocable === false`（典型的 `disable-model-invocation` 反向形态——“仅模型可调”），直接告诉用户“让 Claude 来调”（`processSlashCommand.tsx:535-547`）。

### 3.3 模型 invoke skill：SkillTool 路径

1. 模型决定使用 skill 时，工具调用形如 `Skill({ skill: "verify", args: "lint && test" })`。
2. `SkillTool.validateInput`（`src/tools/SkillTool/SkillTool.ts:354-429`）：
   - 去掉前导 `/`；
   - `getAllCommands(context)` 拿到本地命令 + MCP skill；
   - `findCommand` 命中后校验 `disableModelInvocation === false`、`type === 'prompt'`。
3. `checkPermissions`（同文件 432-540 行）走 allow/deny 规则匹配（支持 `name:*` 前缀），再加一条 “只用安全字段的 skill 自动放行”。
4. 通过权限后 `call()` 会拼出一段 user 消息（包含 skill 的 markdown + 用户给的 `args`）注入对话。bundled skill 如果带 `files`，首次调用时 `extractBundledSkillFiles` 把它们写到 `getBundledSkillsRoot()/<name>/`（`src/skills/bundledSkills.ts:131-167`），然后给 prompt 头部加一行 `Base directory for this skill: ...`，模型可以 Read/Grep 这些参考文件。

### 3.4 Skill 加载示例（磁盘）

`getSkillDirCommands` 的并行扫描（`src/skills/loadSkillsDir.ts:679-714`）按下面这张表分发：

| 来源 | 路径模板 | source 标记 |
| --- | --- | --- |
| Managed | `<managed>/.mycli/skills` | `policySettings` |
| User | `~/.mycli/skills` | `userSettings` |
| Project + 父级链 | `<project ↑ home>/.mycli/skills` | `projectSettings` |
| `--add-dir` | `<dir>/.mycli/skills` | `projectSettings` |
| 遗留 commands 目录 | 见 `loadSkillsFromCommandsDir` | `commands_DEPRECATED` |

每个 skill 必须是 `<name>/SKILL.md` 形式（单 `.md` 不被 `/skills/` 接受，见 `loadSkillsFromSkillsDir`：`src/skills/loadSkillsDir.ts:407-480`）；frontmatter 解析给到 `createSkillCommand`，把 markdown body 包进 `getPromptForCommand`，并支持 `${CLAUDE_SKILL_DIR}` / `${CLAUDE_SESSION_ID}` 变量替换（`src/skills/loadSkillsDir.ts:344-369`）。

## 4. 流程图（Mermaid）

```mermaid
flowchart TD
    A[REPL 输入] --> B{以 / 开头?}
    B -- 否 --> Z[当作普通 user prompt]
    B -- 是 --> C[parseSlashCommand]
    C --> D[hasCommand?]
    D -- 否,看起来像命令 --> E[Unknown skill 报错]
    D -- 否,像文件路径 --> Z
    D -- 是 --> F{command.type}
    F -- local-jsx --> G[load + setToolJSX,Ink 模态]
    F -- local --> H[mod.call args ctx,直接返回结果]
    F -- prompt --> I[getPromptForCommand,注入 user message]
    I --> J[继续走查询循环 / 模型推理]

    subgraph SkillTool 路径,模型主动触发
        K[模型输出 tool_use Skill] --> L[validateInput,findCommand + 校验 prompt 类型]
        L --> M[checkPermissions allow deny]
        M --> N[call,拼 prompt 注入对话]
        N --> J
    end

    subgraph 启动期注册
        S1[initBundledSkills] --> S2[registerBundledSkill,内存数组]
        S3[getSkillDirCommands] --> S4[扫描 user / project / managed / --add-dir]
        S2 --> S5[getCommands,合并所有源]
        S4 --> S5
    end
    S5 -. 提供 .-> D
    S5 -. 过滤 prompt 类 .-> L
```

## 5. 与其他模块的交互

- **`src/main.tsx` / REPL**：渲染命令补全菜单时调用 `getCommands(cwd)`、`formatDescriptionWithSource`（`src/commands.ts:728-754`），在 typeahead 中把 source 标签（如 `(plugin)`、`(bundled)`）拼到描述后。
- **`src/query.ts` / `src/QueryEngine.ts`**：`prompt`-type 命令的执行结果以 user message 形式入消息流，正常进入查询循环。
- **`src/tools.ts` / `src/Tool.ts`**：`SkillTool` 注册在工具表中，跟 `Bash`、`Read`、`Edit` 等同级；它的 prompt（`src/tools/SkillTool/prompt.ts`）会动态枚举可用 skill 列表给模型看。
- **`src/utils/permissions/`**：SkillTool 的 allow/deny 规则与其他工具共用一套权限上下文（`AppState.toolPermissionContext`）。
- **`src/services/mcp/`**：MCP server 暴露的 prompt 也是命令（`loadedFrom: 'mcp'`），通过 `getMcpSkillCommands` 注入到 SkillTool 列表里。
- **Plugins**：`src/utils/plugins/loadPluginCommands.ts` 把 plugin 的命令和 skill 加进同一份列表，由 `cmd.pluginInfo` 区分来源。

## 6. 关键学习要点

1. **命令 = Skill 的超集**。`Command` 对象的 `type` 字段决定执行通道（`local` / `local-jsx` / `prompt`），`type === 'prompt' && !disableModelInvocation` 的命令同时是 Skill。`disable-model-invocation` 让一个 prompt 命令“仅用户可调”，`userInvocable: false` 反过来让它“仅模型可调”。
2. **加载是惰性 + memoize 的**。`getCommands` 用 `lodash memoize` 按 cwd 缓存（`src/commands.ts:449-469`），但 `meetsAvailabilityRequirement` 每次都重新跑——auth 状态变化（虽然这个 fork 没有 OAuth 切换）才能立即生效。`clearCommandsCache()` 是任何动态注册新 skill 后的必经路径。
3. **bundled skill 的 `files` 是首次落盘**。registerBundledSkill 时只是闭包记下 `files`，真正写盘发生在第一次 `getPromptForCommand` 调用，且写盘路径带 per-process nonce + `O_EXCL|O_NOFOLLOW`，是有意做了符号链接 / TOCTOU 防护（`src/skills/bundledSkills.ts:170-193`）。改这块要小心。
4. **Skill 路径解析有“安全字段白名单”**。`SkillTool.checkPermissions` 把 “skill 只用安全属性时自动放行” 写成白名单形式（见 `skillHasOnlySafeProperties`），新加属性默认要权限提示；这是为了把行为变更默认设为更严格。
5. **路径条件激活**。skill frontmatter 里的 `paths:` 让 skill 只在用户操作匹配路径的文件时才出现在列表中（`parseSkillPaths` + `conditionalSkills`，`src/skills/loadSkillsDir.ts:771-797`）；这是减少 SkillTool 列表噪声的重要机制。

## 7. 延伸阅读

- `src/skills/loadSkillsDir.ts:861-1080` 动态 skill 发现 / 条件激活相关逻辑（看 `discoverSkillDirsForPaths`、`activateConditionalSkillsForPaths`）。
- `src/tools/SkillTool/prompt.ts` 与 `constants.ts`：模型看到的 SkillTool 描述与默认列表生成。
- `src/utils/markdownConfigLoader.ts`：所有基于 markdown 的配置（包括 skill / commands / agents）的 frontmatter 解析与 path 匹配的统一入口。
- `MYCLI.md` 内的 “Skills” 段：bundled skills 的清单与对外行为约束。
