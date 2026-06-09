# Research：Discord opencode Bridge 相近專案

## 研究目標

確認是否已有「Discord 作為 opencode / coding agent 遠端 chat UI」的相近專案，並整理它們的 session mapping、Discord type 選擇、功能範圍與可借鑑設計。

## 初步結論

這類專案已經存在，而且主流形態是：private Discord server 中的 channel / thread 作為遠端 coding agent UI。多數成熟專案不是使用 DM，而是讓 bot 在 server channel 或 thread 中運作。

對本需求最接近的兩個參考：

- `RoundTable02/remote-opencode`：產品化程度最高，支援 project binding、thread session、passthrough、session attach、queue、worktree、diff、allowlist 與 voice transcription。
- `dtinth/discord-opencode-bridge`：架構最乾淨，明確定位為 standalone bridge，將 Discord threads relay 到 `opencode serve` sessions，不把 domain workflow 塞進 bot。

## 候選專案摘要

| 專案 | 型態 | 可借鑑重點 |
| --- | --- | --- |
| `RoundTable02/remote-opencode` | Discord bot for remote OpenCode CLI access | 成熟功能集合，包含 `/opencode`、`/code` passthrough、`/session`、queue、worktree、diff、allowlist、voice |
| `dtinth/discord-opencode-bridge` | Discord thread ↔ opencode session bridge | bridge-only 架構，thread mapping session，支援多 opencode server / directory |
| `Jeremie-m/discord-opencode-bridge` | Discord channel ↔ opencode session bridge | channel-based session，簡單直覺，但 session 多時 channel list 會膨脹 |
| `fredchu/discord-claude-code-bot` | Discord thread ↔ Claude Code CLI session | 雖非 opencode，但 thread UX、SQLite、streaming、attachments、buttons、terminal handoff 很值得參考 |
| `thesammykins/discord_opencode` | opencode plugin 操作 Discord | 方向相反，讓 opencode agent 發 Discord 訊息與 human-in-loop，可作互動工具參考 |
| `d11405003/Discord_Opencode_dockerized` | Docker + remote-opencode | 容器隔離與部署包裝參考 |
| `AmaanBilwar/discord-coding-agent` | Discord thread planning bot | thread 作為 request / plan context 的簡化範例 |

## `RoundTable02/remote-opencode`

Repo：`https://github.com/RoundTable02/remote-opencode`

定位：從手機、平板或其他電腦透過 Discord 遠端控制本機 OpenCode CLI。

重要功能：

- `/setpath`：註冊 local project path 與 alias。
- `/use`：將 Discord channel 綁定到 project。
- `/opencode`：送 prompt 給 OpenCode，並自動建立 thread。
- `/code`：thread-scoped passthrough mode，之後直接打字就送 OpenCode。
- `/session list / attach / detach / info`：瀏覽並管理 OpenCode sessions。
- `/work`：建立 git worktree 與專用 thread。
- `/autowork`：新 session 自動建立 isolated worktree。
- `/autocode`：新 thread 自動開 passthrough mode。
- `/queue`：同 thread 中排隊多個 prompt。
- `/diff`：在 Discord 中查看 git diff。
- `/allow`：管理 user allowlist。
- `/voice`：管理 voice transcription。

架構觀察：

- 採用 private server / guild 作為主要使用情境。
- Channel 綁定 project，thread 表示 session。
- 支援 passthrough，代表需要讀 message content。
- 有 allowlist，適合避免 shared server 中其他人操作本機 agent。
- 已把 mobile workflow 當核心場景設計。

對本設計的含義：

- 若目標是最快開始使用，應先試 `remote-opencode`。
- 若目標是 Forum Channel = workspace 的 mental model，可能需要確認或擴充它對 `GUILD_FORUM` 的支援。
- 它的 `/session`、`/code`、queue、allowlist 與 opencode server auth 處理值得借鑑。

## `dtinth/discord-opencode-bridge`

Repo：`https://github.com/dtinth/discord-opencode-bridge`

定位：standalone bridge，將 Discord threads 與 OpenCode AI coding sessions 串起來。bridge 不包裝 OpenCode，也不寫 OpenCode plugin，而是連到一或多個 `opencode serve` instance。

重要功能：

- `add-channel`：將 Discord channel 對應到 opencode server URL 與 directory。
- 在 configured text channel 中 mention bot，建立 Discord thread 與 OpenCode session。
- 在 linked thread 中 mention bot，將新訊息送入同一個 OpenCode session。
- `list-sessions`、`get-session`、`link-thread`、`unlink-thread`。
- runtime 讀 database config，因此可不用重啟 bot 就新增 / 移除 channel mapping。
- model responses 透過 SSE events streaming 回 Discord thread。

限制與設計選擇：

- 明確需要 Discord Message Content Intent。
- 不處理 opencode permission / question prompt interactive approval；遇到時通知使用者回 OpenCode 處理。
- bot 管理不在 Discord 裡做，而是用 CLI 做 channel / session mapping。

對本設計的含義：

- 這是最接近「Discord 完全只是 opencode bridge」的現成架構。
- 若要自製，這個專案的 scope 控制很好，可以作為最小實作參考。
- 目前是 channel → server + directory，thread → session；本文件提出的 Forum Channel → workspace 其實是同一概念的 Forum-first 版本。

## `Jeremie-m/discord-opencode-bridge`

Repo：`https://github.com/Jeremie-m/discord-opencode-bridge`

定位：從手機透過 Discord 控制 OpenCode。

重要功能：

- Channel-based sessions：每個 Discord channel map 到 persistent OpenCode session。
- Auto-reconnect：OpenCode 重啟後 session 可重建。
- Long response chunking：避免超過 Discord 訊息限制。
- `DISCORD_CHANNEL_PREFIX` 可限制只監聽特定 channel。
- 使用 `OPENCODE_DEFAULT_PROJECT_PATH` 與 `OPENCODE_SERVER_URL`。

對本設計的含義：

- channel-based session 很簡單，但當使用者會開很多不特定 session 時，會造成 channel list 膨脹。
- 可借鑑 response chunking 與 auto-recreate session，但不建議採用 channel = session 作為主模型。

## `fredchu/discord-claude-code-bot`

Repo：`https://github.com/fredchu/discord-claude-code-bot`

定位：將 Discord threads bridge 到 Claude Code CLI sessions。

重要功能：

- Thread sessions：每個 Discord thread 對應一個 Claude Code session。
- Thread context：fetch recent messages 讓 agent 理解 Discord thread 對話。
- Streaming preview：工作中即時預覽回覆與 tool-use status。
- Interactive buttons：AskUserQuestion permission prompts 以 Discord buttons 呈現。
- File attachments：自動下載附件並傳給 Claude Code Read tool。
- SQLite storage：thread ID 到 session UUID 的 crash-safe mapping。
- `/new`、`/model`、`/cd`、`/stop`、`/sessions`、`/resume-local`、`/handback`。
- Terminal takeover：同一 session 可在 Discord 與 terminal 之間交接。

對本設計的含義：

- 雖然 backend 不是 opencode，但它把 Discord thread 當 session UI 的 UX 做得很完整。
- SQLite、streaming preview、attachments、button prompt、terminal handoff 都可作為後續進階功能參考。
- 它也證明 private server + thread 是 coding agent Discord UI 的自然模型。

## `thesammykins/discord_opencode`

Repo：`https://github.com/thesammykins/discord_opencode`

定位：opencode plugin，提供 tools 讓 AI agent 主動操作 Discord。

重要功能：

- send messages / embeds / buttons。
- file uploads。
- thread management。
- human-in-the-loop：request input、approval、notify human。
- project commands 與 allowlisted command execution。
- session store optional SQLite。

對本設計的含義：

- 它是反方向：opencode agent → Discord，而不是 Discord → opencode。
- 若後續要讓 opencode 主動在 Discord 發 human approval、status update 或 rich UI，可參考其 tool design。
- 不適合作為第一版 bridge core。

## 其他候選與生態觀察

`d11405003/Discord_Opencode_dockerized` 將 opencode 與 Discord remote control 放進 Docker，適合參考隔離與部署。但它主要基於 `remote-opencode` 與 `opencode-dockerized`，不是新的 bridge 模型。

`AmaanBilwar/discord-coding-agent` 目前主要是 mention bot 後建立 dedicated thread，並用 Groq 進行需求釐清與 plan drafting。coding / PR 仍是 roadmap，但 thread 作為 request context 的模式可參考。

GitHub search 也出現多個 remote coding agent / opencode remote control 專案，例如 Android companion、Mattermost plugin、Telegram / Feishu remote control、remote control app for multiple coding agents。這代表「手機或 chat app 作為 coding agent remote UI」是活躍方向。

## Discord type 選擇比較

| 模型 | 優點 | 缺點 | 判斷 |
| --- | --- | --- | --- |
| DM → session switch | 不需要 server channel 結構 | 不適合多 session，需要指令切換 | 不推薦 |
| Text Channel → session | 實作最簡單 | session 多時 channel list 變亂 | 只適合少量固定 session |
| Text Channel + Thread → session | 現成專案最多、穩定 | 比較像 Slack，而不是 ChatGPT Project | 現成工具優先路徑 |
| Forum Channel + Forum Post → session | 最像 ChatGPT Project / session list | 現成工具支援需驗證，bot 實作略多 | 推薦作為本 framework 的目標模型 |

## 建議

短期若想立即使用，先試 `remote-opencode`。

若要自製或 fork，建議以 `dtinth/discord-opencode-bridge` 的乾淨 bridge 模型為起點，改成 Forum-first：Forum Channel 對應 workspace config，Forum Post 對應 opencode session。

第一版不要先做 DW嚴選商品 workflow、PR broker、permission button、voice 或 worktree。先驗證：

```text
Forum Post message
→ opencode session
→ response back to same post
```

一旦這條 bridge 通了，再把 `005-discord-agent-git-publish-flow` 的 domain workflow 加成特定 Forum Channel 的 workspace behavior。
