# 10 · 后台任务系统 + IDE Bridge

## 1. 模块作用

这一份文档讲两个相邻但不重合的子系统：

- **后台任务系统（`src/tasks/`）**：模型可以"后台跑"东西的能力——`run_in_background` 起 bash 进程、Task tool 派 sub-agent、`/ultraplan` 等命令派云端 routine。任务有生命周期（`pending` / `running` / `completed` / `failed` / `killed`），输出落地到磁盘文件，完成时通过通知队列回灌给主 agent。
- **IDE bridge（`src/bridge/`）**：`mycli remote-control` 的实现。让一台机器上的 mycli 进程接受来自 claude.ai/code 网页或手机 app 的会话指令；本地 fork 子进程跑实际任务，状态/输出/权限请求经云中转双向同步。

两个子系统在"派/收/管"上有形似的代码（都依赖 `cleanupRegistry`、都用 SDK message 格式做通信、都有 polling），但目标完全不同：tasks 是"主 agent 在自己进程内派一个孩子"，bridge 是"远端服务器派活给本地 mycli 进程"。

## 2. 关键文件与职责

### 后台任务系统

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/tasks/types.ts` | 46 | `TaskState` 联合类型（7 种 task 类型）；`isBackgroundTask` 判定后台显示 |
| `src/tasks/LocalShellTask/LocalShellTask.tsx` | 522 | bash 后台任务实体：监视 stall、转发完成通知、维护 `isBackgrounded` 状态 |
| `src/tasks/LocalShellTask/guards.ts` | 41 | `LocalShellTaskState` 类型与 `isLocalShellTask` 类型守卫（独立出来给非-React 模块用） |
| `src/tasks/LocalShellTask/killShellTasks.ts` | 76 | SIGTERM→SIGKILL 优雅清理；`killShellTasksForAgent` 在 sub-agent 退出时清孤儿 bash |
| `src/tasks/LocalAgentTask/LocalAgentTask.tsx` | 682 | sub-agent 后台任务（Task tool / `/agent`）：进度跟踪、token 计数、recent activities ring buffer、pending message 抽屉、resume |
| `src/tasks/RemoteAgentTask/RemoteAgentTask.tsx` | 855 | 云端 routine：注册到 claude.ai/code，1s 一次轮询事件流，落 transcript 到本地，支持 `--resume` 重连 |
| `src/tasks/InProcessTeammateTask/InProcessTeammateTask.tsx` | 125 | "组员"——同进程协作的另一个 agent，IPC 走 in-process 而非子进程 |
| `src/tasks/DreamTask/DreamTask.ts` | 157 | "做梦"任务（实验性后台思考） |
| `src/tasks/MonitorMcpTask/MonitorMcpTask.ts` | 5 | **stub**：`isMonitorMcpTask` 永远返回 false。源码图无法还原此模块的实现 |
| `src/tasks/LocalWorkflowTask/LocalWorkflowTask.ts` | 5 | **stub**：同上 |
| `src/tasks/LocalMainSessionTask.ts` | 479 | "主会话"作为一种特殊 task 接入框架（让 task 列表能聚合主 session） |
| `src/tasks/stopTask.ts` | 100 | `stopTask(taskId, ctx)`——`TaskStopTool` / SDK 控制请求都走这；按类型派发 `kill()` |
| `src/tasks/pillLabel.ts` | 82 | UI pill 标签的纯函数渲染（"Background command 'foo' completed"）|
| `src/utils/task/framework.ts` | — | `registerTask` / `updateTaskState`、SDK 事件发射、磁盘输出读写、轮询常量 `POLL_INTERVAL_MS = 1000` |
| `src/utils/task/diskOutput.ts` | — | task 输出文件路径管理（NDJSON），供下游读取 |

### IDE Bridge

| 文件 | 行数 | 职责 |
|------|------|------|
| `src/bridge/types.ts` | 262 | 协议类型：`WorkResponse`、`WorkSecret`、`SessionHandle`、`BridgeApiClient`、`SpawnMode`、`BridgeWorkerType`；`BRIDGE_LOGIN_ERROR` 等错误文案 |
| `src/bridge/bridgeMain.ts` | 2999 | `claude remote-control` 主入口：环境注册→长轮询→分发 work→spawn 子进程→心跳→优雅关停 |
| `src/bridge/bridgeApi.ts` | 539 | Environments API HTTP 封装（axios）：`registerBridgeEnvironment`、`pollForWork`、`acknowledgeWork`、`stopWork`、`heartbeatWork`、`reconnectSession`、`deregisterEnvironment` |
| `src/bridge/bridgeMessaging.ts` | 461 | 纯函数协议帮手：`isSDKMessage` / `isSDKControlRequest` / `isSDKControlResponse` 类型守卫，`handleIngressMessage`、`handleServerControlRequest`、UUID echo 去重 |
| `src/bridge/replBridge.ts` | 2406 | REPL bridge core：`initBridgeCore` 把当前 REPL 会话连上 claude.ai/code（环境 API 模式）|
| `src/bridge/initReplBridge.ts` | 569 | REPL 上层包装：从 bootstrap state 读 cwd/sessionId/git/OAuth，决策 v1/v2 transport，调 `initBridgeCore` |
| `src/bridge/remoteBridgeCore.ts` | 1008 | "env-less" v2 bridge：跳过 Environments API，直连 `/v1/code/sessions` + `/bridge`；REPL only |
| `src/bridge/sessionRunner.ts` | 550 | `createSessionSpawner` 在 bridge 模式下 fork mycli 子进程：`--print --sdk-url ... --session-id ... --input-format stream-json --output-format stream-json` |
| `src/bridge/replBridgeTransport.ts` | 370 | v1（HybridTransport：WS 读 + POST 写）和 v2（SSETransport + CCRClient）的统一接口抽象 |
| `src/bridge/createSession.ts` | 384 | claude.ai 上创建/归档 bridge session（`POST /v1/code/sessions`）|
| `src/bridge/codeSessionApi.ts` | 168 | `/v1/code/sessions` 的薄封装 |
| `src/bridge/bridgeUI.ts` | 530 | 状态栏 / live display / 多 session 列表的渲染 |
| `src/bridge/jwtUtils.ts` | 256 | session ingress JWT 解析、过期监控、`createTokenRefreshScheduler` 提前 5 分钟刷 token |
| `src/bridge/trustedDevice.ts` | 210 | trusted device token 持久化（替代每次 OAuth）|
| `src/bridge/inboundMessages.ts` / `inboundAttachments.ts` | 80 / 175 | 处理来自远端的 user message + attachment（图片/文件）|
| `src/bridge/flushGate.ts` | 71 | 连接握手期间的写门：buffer 住 writeMessages，连接成功后一次性放出 |
| `src/bridge/capacityWake.ts` | 56 | server 在容量受限时主动唤醒长轮询 |
| `src/bridge/pollConfig.ts` / `pollConfigDefaults.ts` | 110 / 82 | 长轮询参数（间隔、退避） |
| `src/bridge/bridgeConfig.ts` | 48 | API base URL / OAuth token 取数 |
| `src/bridge/bridgeEnabled.ts` | 202 | feature flag 与版本检查 |
| `src/bridge/sessionIdCompat.ts` | 57 | infra session id 与 compat session id 的双向转换（CSE shim 兼容） |
| `src/bridge/workSecret.ts` | 127 | base64url 解码 `work.secret`，构造子进程的 `--sdk-url` |
| `src/bridge/bridgeDebug.ts` | 135 | debug handle 注册、故障注入（仅测试） |
| `src/bridge/peerSessions.ts` | 3 | **stub**：3 行 |
| `src/bridge/webhookSanitizer.ts` | 3 | **stub**：3 行 |

## 3. 执行步骤（带 file:line 引用）

### 后台任务系统（以 `LocalShellTask` 为代表）

1. **派生**。模型用 `Bash` 工具带 `run_in_background: true` 调用，工具实现把命令交给 `spawnShellTask` (`src/tasks/LocalShellTask/LocalShellTask.tsx:180`)。
2. **状态注册**。`createTaskStateBase` + `registerTask(taskState, setAppState)` (`src/utils/task/framework.ts:77`) 把 task 写进 `AppState.tasks[taskId]`，并向 SDK 队列发 `task_started` 事件 (`framework.ts:104`)。
3. **进程接管**。`shellCommand.background(taskId)` (`src/tasks/LocalShellTask/LocalShellTask.tsx:220`) 把已经在跑的 ShellCommand 转成"后台模式"——输出继续写到 `getTaskOutputPath(taskId)`（NDJSON），但不阻塞前台对话。
4. **stall 看门狗**。`startStallWatchdog` (`src/tasks/LocalShellTask/LocalShellTask.tsx:46`) 每 5s 看输出文件大小，连续 45s 没增长且尾巴像交互 prompt（`(y/n)`、`Continue?` …）就给主 agent 发提醒，让模型决定是否 kill。
5. **完成回写**。`shellCommand.result.then(...)` (`src/tasks/LocalShellTask/LocalShellTask.tsx:222`) 拿到子进程退出码，更新 `task.status = 'completed' | 'failed'`，调 `enqueueShellNotification` 把 `<task_notification>...</task_notification>` XML 推进 message queue (`LocalShellTask.tsx:166`)，下一轮 LLM 调用就会看到。
6. **kill 路径**。`stopTask(taskId, ctx)` (`src/tasks/stopTask.ts:38`) 查表→`taskImpl.kill()`→分类型派发：
   - `LocalShellTask.kill` 调 `killTask` (`LocalShellTask.tsx:174-178`)，`killShellTasks.ts` SIGTERM→SIGKILL 优雅清理。
   - `LocalAgentTask.kill` (`LocalAgentTask.tsx:281-309`) 取消 abortController，更新 `task.status = 'killed'`，发完成通知。
   - `RemoteAgentTask.kill` (`RemoteAgentTask.tsx:808+`) 停 polling，调 CCR archive。
7. **磁盘输出 / SDK 事件**。`framework.ts` 在每次 status 变更时通过 `enqueueSdkEvent` 推 `task_status` 事件，外部 SDK 消费者（`mycli --print`）能流式拿到状态。
8. **资源清理**。`registerCleanup(async () => killTask(...))` (`LocalShellTask.tsx:200`) 让进程退出时（包括 Ctrl+C）保证子进程被收掉；任务自然完成时调 `unregisterCleanup` 撤销。
9. **`RemoteAgentTask` 特有的 polling**：`startRemoteSessionPolling` (`RemoteAgentTask.tsx:538`) 1s 一次拉 `pollRemoteSessionEvents`，把 server-side log 的增量 append 进本地文件；status `archived` → 完成；`completionCheckers.get(remoteTaskType)` 还允许针对 `autofix-pr` 这类任务用自定义条件提前判完成。
10. **`--resume` 还原**：`restoreRemoteAgentTasks` (`RemoteAgentTask.tsx:477`) 扫 `~/.mycli/...sidecar/remote-agents/`，对每个仍 alive 的 remote session 重启 polling 和 transcript 拼接；archived/404 的清掉。

### IDE Bridge（`claude remote-control`）

1. **入口**。`src/entrypoints/cli.tsx:126-160` 看到第一个 arg 是 `remote-control` 时动态 import `./bridge/bridgeMain.js` 并把剩余 args 给它。
2. **环境注册**。`bridgeMain` 调 `api.registerBridgeEnvironment(config)` (`src/bridge/bridgeApi.ts:142`)：HTTP `POST` 到 Environments API，用 OAuth token 鉴权，server 返 `environment_id` + `environment_secret`。`config` 含 `bridgeId`（client UUID）、`workerType`、`reuseEnvironmentId?`（resume 用），见 `types.ts:81-115`。
3. **长轮询**。`api.pollForWork(environmentId, environmentSecret)` (`src/bridge/bridgeApi.ts:199`) 用 `environment_secret` 鉴权，server hold 一段时间然后回一个 `WorkResponse`（含 `WorkData{type:'session'|'healthcheck', id}` 和 base64url 编码的 `secret`）。
4. **work secret 解码**。`decodeWorkSecret(work.secret)` (`workSecret.ts`) 解出 `session_ingress_token`、`api_base_url`、`auth`、`mcp_config`、`environment_variables` 等运行时凭据 (`types.ts:33-51`)。
5. **fork 子进程**。`createSessionSpawner(deps).spawn(opts, dir)` (`sessionRunner.ts:248`) 起一个 mycli 子进程，命令行：
   ```text
   <execPath> [<scriptArgs>] --print --sdk-url <url> --session-id <id>
              --input-format stream-json --output-format stream-json
              --replay-user-messages [--verbose] [--debug-file ...]
   ```
   stdin/stdout/stderr 全 pipe (`sessionRunner.ts:335`)，env 中清掉 bridge 自己的 OAuth token，把 `CLAUDE_CODE_SESSION_ACCESS_TOKEN` 注入子进程 (`sessionRunner.ts:306-323`)；如果是 CCR v2 还会塞 `CLAUDE_CODE_USE_CCR_V2=1` + `CLAUDE_CODE_WORKER_EPOCH`。
6. **stdout 解析**。父进程 readline 子进程 stdout，每行 NDJSON parse 成 SDK message；通过 `extractActivities` (`sessionRunner.ts:107`) 抽出 "Reading foo.ts" 这种 human-readable activity，喂回给 `BridgeLogger.updateSessionStatus` 显示在 status bar (`types.ts:227`)。
7. **ack work**。`api.acknowledgeWork` (`bridgeApi.ts:249`) 告诉 server "我收到这个 work 了，开始处理"——server 把这条记录从 PEL 移到 in-progress。
8. **心跳**。每隔一段时间 `heartbeatActiveWorkItems` (`bridgeMain.ts:202`) 用 session ingress token（不是 environment secret）刷活；401/403 → 调 `api.reconnectSession` 让 server 用新 JWT 重发 (`bridgeMain.ts:244-262`)。这是修 CC-1263 的关键：v2 daemon 5h 后会因 lease 过期默默挂掉。
9. **JWT proactive refresh**。`createTokenRefreshScheduler` (`jwtUtils.ts`) 在 ingress JWT 过期前 5 分钟开 timer：v1 走 OAuth 直发新 token；v2 走 `reconnectSession` 触发 server 重派 (`bridgeMain.ts:284`)。
10. **REPL 直连模式**。当 mycli 自己以 REPL 形态启动并启用 remote-control（不是 `remote-control` 子命令），调 `initBridgeCore` (`replBridge.ts`) → 通过 Environments API 创建 session；新版用 `initEnvLessBridgeCore` (`remoteBridgeCore.ts:140`) 跳过 Environments API 直接走 `/v1/code/sessions` + `/v1/code/sessions/{id}/bridge` 拿 worker_jwt。
11. **transport 选择**。`replBridgeTransport.ts` 给 v1（`HybridTransport`：WS 读 + POST 写）和 v2（`SSETransport` + `CCRClient`）做了统一接口；构造时分支隔离，运行时一视同仁 (`replBridgeTransport.ts:23-70`)。
12. **消息处理**。`handleIngressMessage` (`bridgeMessaging.ts`) 解析远端来的 user message（含 attachment），转换成本地 `Message` 注入到 REPL；`handleServerControlRequest` 处理远端发来的 `control_request`（`can_use_tool` 权限请求等），把 user 的批准结果通过 `transport.write` 回送。
13. **优雅关停**。`registerCleanup` 在进程退出（SIGTERM / SIGINT）时调 `api.deregisterEnvironment(environmentId)` (`bridgeApi.ts:308`) 删环境；活跃 session SIGTERM→默认 30s grace→SIGKILL (`bridgeMain.ts:65-67`)。

## 4. 流程图（Mermaid）

```mermaid
sequenceDiagram
  autonumber

  participant Model as 主 agent (LLM)
  participant Tool as Bash / Task tool
  participant TaskFW as Task framework<br/>(framework.ts)
  participant State as AppState.tasks
  participant Child as 子进程 / sub-agent
  participant MQ as message queue
  participant CC as claude.ai/code 后端
  participant Spawner as createSessionSpawner

  rect rgb(240, 248, 255)
    Note over Model,MQ: 后台任务系统：派生 → 跑 → 完成回灌
    Model->>Tool: Bash run_in_background:true
    Tool->>TaskFW: spawnShellTask + registerTask
    TaskFW->>State: tasks[id] = running
    TaskFW->>Child: spawn / fork
    Child-->>TaskFW: 输出写入 getTaskOutputPath
    Note over Child,TaskFW: stall 看门狗 5s tick<br/>无新输出 + 像 prompt → 通知
    Child-->>TaskFW: exit code
    TaskFW->>State: tasks[id] = completed
    TaskFW->>MQ: enqueuePendingNotification<br/>&lt;task_notification&gt; XML
    MQ->>Model: 下一轮看到完成消息
  end

  rect rgb(255, 248, 240)
    Note over Model,CC: 远程任务/Bridge：远端 → 本地 → 远端
    Model->>CC: registerBridgeEnvironment (OAuth)
    CC-->>Model: environment_id + secret

    loop pollForWork (长轮询)
      Model->>CC: pollForWork(env_id, secret)
      CC-->>Model: WorkResponse + work.secret
      Model->>Spawner: spawn 子进程<br/>--sdk-url --session-id<br/>--input-format stream-json
      Spawner->>Child: fork mycli
      Model->>CC: acknowledgeWork

      par session 运行
        Child-->>Spawner: stdout NDJSON
        Spawner-->>Model: SDK messages + activities
        Model-->>CC: control_response<br/>(权限批准等)
      and 心跳
        Model->>CC: heartbeatWork (ingress JWT)
        Note over Model,CC: 401/403 → reconnectSession
      and JWT 刷新
        Model->>CC: 提前 5min 触发 refresh
      end

      Child-->>Spawner: 进程退出
      Spawner-->>Model: SessionDoneStatus
    end

    Model->>CC: deregisterEnvironment (退出时)
  end
```

## 5. 与其他模块的交互

- **`src/state/AppState.ts`**：`tasks: Record<string, TaskState>` 是 task 子系统的真理之源；UI（`src/components/TaskPanel*`、status pill）订阅这棵子树渲染。
- **`src/utils/messageQueueManager.ts`**：完成通知通过 `enqueuePendingNotification` 进队列，`mode: 'task-notification'`（任务）或 `'prompt'`（channel）；下一轮 LLM 调用前会被 drain 进 prompt。
- **`src/utils/sdkEventQueue.ts`**：`enqueueSdkEvent` 把 task 状态变更同步给 SDK 消费者（`mycli --print` 流式输出）。
- **`src/Tool.ts`** + **`src/tools/Bash/Bash.tsx`**、**`src/tools/AgentTool/`**：派生 task 的工具实现；它们调 `spawnShellTask` / `registerAsyncAgent` 然后立刻返回 task id 给模型。
- **`src/tools/TaskStopTool/`**：让模型自主 kill 后台任务的工具，内部调 `stopTask` (`src/tasks/stopTask.ts:38`)。
- **`src/utils/cleanupRegistry.ts`**：`registerCleanup` 让进程退出（包括异常）时收尾子进程；task 和 bridge 都用。
- **`src/bridge/`** 与 **`src/services/api/mycli.ts`**：bridge 不走主 API client，用 axios 直连 Environments API；session 真正的 LLM 推理还是在 fork 出来的子进程里走主 API client。
- **`src/services/mcp/`** ↔ **`src/tasks/MonitorMcpTask/`**：原本设计是 `MonitorMcpTask` 监听 MCP server 推送的事件、自动派生 task 处理；当前是 stub，无实际行为（见下文）。
- **OAuth / trusted device**：`src/bridge/trustedDevice.ts` 负责持久化 device token，避免每次 `claude remote-control` 都过 OAuth；这与"mycli 主体已禁用 OAuth"并不冲突——bridge 是 claude.ai 远程控制 feature，必须走 OAuth，settings.json apiKey 路径不可用。

## 6. 关键学习要点

1. **task 子系统是 React-state-中心化的**：`AppState.tasks` + setState 是事实根源；磁盘输出和通知队列都是它的下游。要新增 task 类型，只需 (a) 实现 `Task` 接口的 `kill`，(b) 加进 `tasks/types.ts` 的 union，(c) 在创建处调 `registerTask`，框架其余的事（SDK 事件、UI、stop tool）会自动接上。
2. **完成通知是 XML 重新喂给模型**：tasks 通过 `<task_notification>` XML 把退出码、status、output 文件路径塞进 prompt——模型本身就懂这套 tag (`src/constants/xml.ts`)。这就是"模型为什么知道我后台命令跑完了"的答案。
3. **bridge 的真正复杂性在 token 生命周期**：单次 work 处理流要协调三个 token——OAuth（注册 environment）、environment_secret（poll）、session_ingress_token（heartbeat / control_response 回送）。`bridgeMain.ts:202-269` 的心跳 + reconnect 逻辑核心就是修这套 token 链上某一环过期时的 silent-death bug。
4. **bridge 是父进程 fork 子进程模式，不是 in-process**：父进程只负责"把活儿派进子进程的 stdin、把子进程 stdout 转发到 server"。真正的 mycli 主循环跑在子进程里。这就是为什么 `sessionRunner.ts:335` 用 `child_process.spawn` 而不是 worker thread——隔离 + 单进程崩了不影响 bridge。
5. **v1 vs v2 双 transport 同时存活**：feature flag 决定走 Environments API（v1，HybridTransport）还是直接走 `/v1/code/sessions`（v2，SSETransport+CCRClient）。`replBridgeTransport.ts:23-70` 做了统一抽象，bridge 上层完全不感知。新代码应优先 v2，但短期内删不掉 v1。
6. **若干 stub 是已知缺失**：
   - `src/tasks/MonitorMcpTask/MonitorMcpTask.ts` 5 行（`isMonitorMcpTask` 永返 false）
   - `src/tasks/LocalWorkflowTask/LocalWorkflowTask.ts` 5 行
   - `src/bridge/peerSessions.ts` 3 行
   - `src/bridge/webhookSanitizer.ts` 3 行
   
   这些是源码图无法完整还原的模块。**此处实现复杂、上游私有，本文档不展开，按"设计意图占位 + 暂无功能"理解即可**。引用它们的代码会得到 noop 行为，不会崩。

## 7. 延伸阅读

- `MYCLI.md` 中关于 `tasks/` 与 `bridge/` 的目录索引段落。
- `docs/architecture/03-agent-loop.md`（query loop 怎么读 task 完成通知 / 怎么调用 stop_task）
- `docs/architecture/09-mcp-integration.md`（MonitorMcpTask 设计意图：监听 MCP server push 派生新 task）
- 子进程协议：`src/entrypoints/sdk/controlTypes.ts`（`control_request` / `control_response` / `StdoutMessage` 形状）。
- 文档外的私有协议参考：claude.ai/code Environments API、`/v1/code/sessions` Streamable HTTP（仅 Anthropic 内部可见）。
- 可执行 smoke：`bun run dev` 启 REPL 后跑 `/remote-control` 触发 bridge；`bun run dev -- -p "ls && echo done" --output-format stream-json` 触发 task 框架的 stream-json 输出路径（同 bridge 子进程相同模式）。
