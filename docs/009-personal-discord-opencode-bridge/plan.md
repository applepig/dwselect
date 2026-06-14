# Personal Discord opencode Bridge

## 背景

本文件包記錄一個比 `005-discord-agent-git-publish-flow` 更通用的個人用遠端 agent UI 構想：Discord 不負責 DW嚴選商品 workflow，也不直接理解 Git publish flow；Discord 只作為 opencode 的 bridge / UI shell。

使用者希望自己一個人透過 Discord 開不特定多數 chat session，每個 chat session 對應一個 opencode session。訊息流保持單純：使用者在 Discord 傳訊息給 bot，bot 將訊息送進 opencode session，opencode 呼叫 GPT provider 與 tools，回覆再沿路回到 Discord。

```text
Discord message
→ Discord bot / bridge
→ opencode serve / SDK
→ opencode session
→ GPT provider / tools
→ opencode response / events
→ bridge
→ Discord reply
```

## 與既有文件分工

`005-discord-agent-git-publish-flow` 是 DW嚴選 domain workflow，重點是商品 CRUD、category PR grouping、GitHub PR broker 與 guardrails。

本文件包是通用 bridge framework，重點是 Discord workspace / session model 如何對應 opencode work-dir / session。後續 `005` 可以建立在本 framework 上，但不應把商品 domain policy 寫進 bridge core。

## Discord 心智模型

簡化理解：

| Discord type | 可理解成 | 在本設計中的角色 |
| --- | --- | --- |
| Server | 私人工作區 | 個人 bot 所在的總空間 |
| Text Channel | Slack channel | 一條持續聊天的大聊天室 |
| Thread | Slack thread | 一個獨立小對話，可對應一個 opencode session |
| Forum Channel | ChatGPT Project / 討論區 / 任務看板 | 一個 workspace / project，可綁定一個 work-dir |
| Forum Post | ChatGPT 中的一條 chat / GitHub Discussion | 一個獨立 opencode session |

使用者目前的 mental model 是：Forum Channel 比較像 ChatGPT Project；普通 Text Channel + Thread 比較像 Slack。

## 已收斂方向

推薦架構：

```text
Discord Forum Channel = opencode workspace / project
Forum Channel work-dir = opencode session default cwd
Forum Post / Thread = single opencode session
Post messages = session turns
```

範例：

```text
Server：applepig-opencode

Forum：DW嚴選
cwd：/home/applepig/Dropbox/projects/dwselect
├── Post：002 roadmap discord bridge → opencode session A
├── Post：商品 JSON schema → opencode session B
└── Post：修首頁 bug → opencode session C

Forum：toybox infra
cwd：/home/applepig/Dropbox/projects/toybox
├── Post：Traefik 設定 → opencode session D
└── Post：備份策略 → opencode session E
```

## 核心原則

- Discord 是 bridge，不是 agent brain。
- opencode session 是真正的對話狀態來源。
- Forum Channel 是 workspace boundary。
- Forum Post / Thread 是 session boundary。
- 同一個 bot 可以服務多個 Forum Channel，每個 Forum Channel 有各自的 work-dir、model、agent 與 permission profile。
- bridge core 不應知道 DW嚴選商品 CRUD、PR grouping 或 schema policy；那些屬於 domain workflow layer。
- 先支援個人使用，不先設計多人協作或公開 bot。

## 候選資料模型

Workspace config：

```ts
type WorkspaceConfig = {
  forum_channel_id: string
  name: string
  opencode_server_url: string
  work_dir: string
  default_model?: string
  default_agent?: string
  permission_profile?: string
  auto_passthrough: boolean
  enabled: boolean
}
```

Session mapping：

```ts
type SessionMapping = {
  forum_post_thread_id: string
  forum_channel_id: string
  opencode_session_id: string
  title: string
  status: "idle" | "running" | "blocked" | "archived"
  created_at: string
  updated_at: string
}
```

訊息 routing：

```text
Discord message in forum post
→ 用 thread_id 找 SessionMapping
→ 若不存在，建立 opencode session
→ 用 forum_channel_id 找 WorkspaceConfig
→ 將訊息送到該 opencode session
→ 透過 opencode SSE / response 回 Discord post
```

## 第一版功能範圍草案

最小可用功能：

- 設定多個 Discord Forum Channel，每個綁定一個 `work_dir`。
- 使用者在 Forum Post 中傳訊息，bridge 轉送到該 post 對應的 opencode session。
- 若 Forum Post 尚未有 mapping，自動建立 opencode session，title 使用 post title。
- opencode 回覆送回同一個 Forum Post。
- 長回覆分段，避免 Discord 2000 字限制切壞 code block。
- 每個 post 同一時間只跑一個 opencode turn；後續訊息先 queue 或回 busy。
- `/new` 或等價 command 可讓同一 post 換成新 opencode session。
- `/abort` 可停止目前 running turn。
- `/session` 可顯示目前 Discord post 對應的 opencode session id。

延後功能：

- DW嚴選商品 CRUD / PR broker。
- 自動建立 git worktree。
- permission request 在 Discord button 中互動批准。
- voice message transcription。
- 多人 access control 細節。
- Forum tags 對應 model / agent / permission。

## Discord 權限與風險

若要在 Forum Post 中直接自然打字並由 bot 讀取內容，通常需要啟用 Discord `MESSAGE_CONTENT` privileged intent。因為此 bot 先以個人私有 server 使用為前提，這個風險可接受，但仍應限制 bot 只處理已啟用的 Forum Channel。

建議權限：

- `bot`
- `applications.commands`
- View Channels
- Send Messages
- Read Message History
- Create Public Threads
- Send Messages in Threads
- Attach Files（若要支援附件）
- Message Content Intent（若要支援 passthrough）

## opencode 整合要點

本機 survey 時 opencode 版本為 `1.16.2`。`opencode serve` / HTTP API / `@opencode-ai/sdk` 足以作為 bridge control plane。

可用能力：

- `opencode serve` 提供 HTTP API 與 OpenAPI spec。
- `POST /session` 建立 session。
- `POST /session/:id/message` 可同步送 prompt。
- `POST /session/:id/prompt_async` 可非同步送 prompt。
- `GET /event` 或 `/global/event` 可訂閱 SSE events。
- `GET /session/:id/message` 可讀 transcript。
- `GET /session/:id/diff`、`GET /file/status` 可讀 session diff 與檔案狀態。
- `POST /session/:id/abort` 可停止 running session。
- `POST /session/:id/fork` 可 fork session。
- `POST /session/:id/permissions/:permissionID` 可回應 permission request。

安全注意：

- bridge 應明確指定 opencode server port，不依賴預設值。
- opencode server 應綁定 `127.0.0.1` 或受控內網。
- 若 server 可能被非本機存取，必須設定 `OPENCODE_SERVER_PASSWORD`。
- 不使用 `--dangerously-skip-permissions`。
- 第一版可先把 opencode permission 設為明確 allow / deny，避免 Discord bridge 卡在 interactive permission prompt。

## 待釐清事項

- 第一版要直接採現成 `remote-opencode`，還是自製一個更薄的 Forum-first bridge。
- Forum Channel 支援是否要先做，或先用 Text Channel + Thread 驗證 opencode relay。
- workspace config 儲存在 JSON、SQLite，或專案內設定檔。
- 每個 Forum Channel 是否對應單一 opencode server，或支援同一 bot 連多個 server。
- 回覆要採 message streaming edit，或完成後一次回覆加進度狀態訊息。
- opencode permission request 是否要在第一版就映射為 Discord button。
