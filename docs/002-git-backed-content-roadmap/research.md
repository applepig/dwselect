# Research：Pi Agent、Codex App、opencode、OpenClaw、Hermes Agent 與 Agentic Flow

## 研究目標

評估 Pi Agent、Codex App / app-server / SDK、opencode、OpenClaw、Hermes Agent 是否適合作為 DW嚴選 inside workflow 的 LLM draft agent backend 或 remote control plane。目標不是立即實作，而是確認它們能否支援「商品 URL → content JSON draft → branch/MR → 人工審核 → CI/CD rebuild」這條流程。

## 初步結論

早期研究判斷：Pi Agent 概念上適合本專案的 agentic flow，但仍需 technical spike 驗證。若選 Pi，第一版不應直接寫 Pi extension 或把 workflow 綁死在 Pi internals；較穩妥的方向是由 local Node orchestrator 以 RPC subprocess 方式呼叫 Pi，讓 Pi 產生 draft 檔案與說明，Git 操作與 GitLab MR 建立由 orchestrator 控制。

2026-06-02 補充：Codex App 最近能力已足以列為主要候選。它已支援 worktree mode、integrated terminal、local environments、actions、Git diff / commit / push / PR、automations、remote control、app-server JSON-RPC、Codex SDK、permission profiles、hooks 與 auto-review。對本專案來說，主要缺口不再是 agent 是否能寫檔，而是如何讓 Codex 在受控 worktree / sandbox 中安全操作 GitLab workflow，尤其是 `glab`。

2026-06-02 T3 Code 補充：T3 Code 適合作為 control plane / web GUI 候選與 Codex app-server 參考實作，也可列入第一個「agent 建立 MR」spike 的候選路徑。它目前是 very early WIP，server 主要包裝 Codex app-server、Claude 與 OpenCode provider，再用 WebSocket 將 session 與 orchestration events 投影到 browser UI。T3 Code 已有 GitLab source control provider，且透過 `glab` 支援 list / view / create merge request；schema validation、diff scope check、draft-only MR、禁止 merge 等 guardrails 可留到後續安全加強。

2026-06-02 OpenClaw / Hermes Agent 補充：OpenClaw 適合作為 Discord / Telegram / Slack 等 chat channel 到 coding agents 的 self-hosted gateway，尤其適合「從 Discord 觸發、保持 session 可觀察、把結果回報到原 thread」這一層；但它本身不是 DW嚴選的 product JSON / GitLab MR policy broker。Hermes Agent 適合作為長期 category research 與偏好記憶的 persistent personal agent，但 self-improving memory / skills 會讓審核邊界更複雜，不建議作為第一個 MR spike 的主 backend。OpenAI subscription 方面，OpenAI 官方文件顯示 Codex 已包含於 ChatGPT Free、Go、Plus、Pro、Business、Edu、Enterprise plans；本機 Codex 已用 ChatGPT auth 登入並可連線，但 CLI status 不會直接顯示目前 plan 與剩餘 limits。

2026-06-02 opencode session 控制補充：本機 opencode 1.15.13 支援 `run --format json`、`--session`、`--continue`、`--fork`、`--attach`、`--dir` 與 `session list --format json`；CLI subprocess 足以做 one-shot draft spike。若要接 Discord bridge，`opencode serve` + HTTP API / JS SDK 更合適，因為可建立 session、送同步或非同步 message、訂閱 SSE events、讀 message / diff / file status、處理 permission request。本機 `opencode serve` health 已驗證通過；但 `serve --help` 顯示預設 port 是 `0`，Discord bridge 應明確指定 port 並啟用 Basic Auth。opencode GitLab 文件主要是 GitLab CI / Duo runner flow，不等於本機 GitLab MR policy broker；本專案仍需 `glab` broker 或受控 action 負責 MR 與 guardrails。

2026-06-02 架構決策：Sprint 3 採 `Discord input adapter + opencode control plane + GitLab MR broker` 作為主路徑。Discord 只是訊息入口之一，不是核心 workflow；未來 Telegram、Slack、Web UI、CLI 或 inside admin 都可以走同一個 bridge contract，把訊息送進 opencode session routing。核心狀態以 `opencode_session_id`、`worktree_path`、`branch_name`、`mr_url` 與 `status` 維護，不綁死 Discord message model。

## Pi 能力摘要

Pi 是 open-source coding agent harness，核心 package 是 `@earendil-works/pi-coding-agent`。

可用能力：

- CLI interactive mode。
- `--mode rpc`，透過 stdin/stdout JSONL 整合。
- `--mode json`，輸出事件 stream。
- Node SDK，可直接建立 `AgentSession`。
- Project-local `.pi/` 設定。
- Skills、prompt templates、TypeScript extensions、Pi packages。
- 可限制 tools，例如 read、write、edit、bash、grep、find、ls。
- session 以 JSONL 保存，方便 debugging 與追蹤。

周邊工具：

- `pi-agent-dashboard`：可視化管理 Pi sessions，適合日後觀察或遠端操作。
- `discord-pi-agent`：Discord gateway，可作為未來丟 link 的入口候選。
- Pi skills / packages：可加入 web search、browser、notification、workflow 類能力。

## 整合方案比較

### 方案 A：RPC subprocess（早期 Pi 推薦）

local Node orchestrator spawn `pi --mode rpc`，送入 prompt，接收 JSONL events，等 agent 完成後檢查檔案變更。

優點：process isolation 較好，容易替換成 opencode 或其他 agent，也容易把 GitLab token 留在 orchestrator，不暴露給 agent。

風險：需要自己寫 RPC client、timeout、event handling、錯誤復原與 session 管理。

### 方案 B：Node SDK embedded

local Node app 直接 import `@earendil-works/pi-coding-agent`，用 `createAgentSession()` 操作 agent。

優點：型別與控制力較完整，不需要 subprocess JSONL framing。

風險：和 Pi package internals 綁較深，升級時需承擔 API 變動風險。

### 方案 C：Pi extension/package

為本專案建立 project-local Pi extension 或 package，註冊 custom tools，例如 `fetch_product_page`、`write_product_draft`、`validate_product_json`。

優點：agent experience 最完整，可把工作流變成 Pi native capability。

風險：第一版成本較高，也會讓 inside workflow 較早綁定 Pi 生態。

### 方案 D：Codex App + Worktree + GitLab MR（新增候選）

使用 Codex App 的 worktree thread 產生 draft。Codex 在 isolated worktree 中修改 `content/products/*.json`，再透過 Codex App、T3 Code source control provider、Codex app-server / SDK、`glab` 或簡化 action 建立 GitLab MR。若後續需要更強安全邊界，再補 `dwselect-create-draft-mr` 這類受控 action，負責 schema validation、diff scope check、commit、push、`glab mr create --draft`。

優點：Codex App 已提供 worktree、thread、terminal、review pane、remote control 與 automations，使用者可以直接在 app 中觀察與接手。若搭配 app-server 或 SDK，也可由 Discord bridge 建立或恢復 thread。

風險：GitLab 不是 Codex App first-class integration，需自行處理 `glab`、GitLab token、MR URL 回報與權限邊界。第一版可接受人工 review MR 作為主要 gate，但仍需避免 agent 直接 merge 或 push main。

### 方案 E：Codex app-server / SDK orchestrated

local Node orchestrator 透過 Codex SDK 或 `codex app-server` 建立、resume、archive thread，並串接 Discord button action。draft job 可以由 orchestrator 明確指定 cwd、sandbox、approval policy 與 prompt。

優點：比直接操作 Codex App UI 更穩定，也比 `codex exec` 更適合長期 session 與串流事件。app-server 支援 thread list、thread resume、thread archive、thread fork、turn events、goal、review、command exec 與 filesystem API。

風險：app-server API 面較大，需要寫 client、保存 thread mapping、處理版本變動與錯誤復原。若只做第一個 spike，可能先用 Codex App 手動 worktree 或 `codex exec` 驗證核心 workflow。

### 方案 F：T3 Code control plane（新增候選）

使用 T3 Code 作為本機 / browser-based control plane，讓使用者透過 web GUI 管理 Codex、Claude 或 OpenCode sessions。T3 Code 的 `apps/server` 是 Node.js WebSocket server，會包裝 `codex app-server` JSON-RPC over stdio，`apps/web` 是 React/Vite UI，shared contracts 定義 provider events、WebSocket protocol、model/session types。

優點：已提供跨 provider session UI 與 Codex app-server client 參考實作；source control layer 已支援 GitHub、GitLab、Bitbucket、Azure DevOps；GitLab provider 會使用 `glab` 並可建立 merge request。若後續需要 inside dashboard，T3 Code 可作為參考架構或可評估 fork / extension。

風險：專案自稱 very early WIP，需使用者自行安裝並登入 provider CLI，例如 `codex login`、`claude auth login`、`opencode auth login`。它不是 sandbox，也不是本專案的 policy broker；GitLab MR 建立目前是一般 source control provider 能力，未包含 product JSON schema validation、diff scope check、draft-only enforcement 或禁止 merge 的專案規則。這些限制不阻塞第一個 MR spike，但若後續要長期使用，仍需補專案規則或外掛 workflow。

### 方案 G：OpenClaw gateway / openclaw-code-agent（新增候選）

使用 OpenClaw 作為 self-hosted messaging gateway，將 Discord、Telegram、Slack、WhatsApp 等 channel 的訊息路由到 coding agents。OpenClaw 官方定位是「multi-channel gateway for AI agents」，支援 single Gateway、Web Control UI、multi-agent routing、agent workspace、skills、session tools、DM pairing / allowlist 與 non-main sandbox mode。OpenClaw 也支援 OpenAI ChatGPT / Codex OAuth subscription path。

若要處理 coding work，OpenClaw 內建 `coding-agent` skill 可把工作委派給 Codex、Claude Code 或 OpenCode background worker；外部 `openclaw-code-agent` plugin 則更貼近本專案需要，因為它提供 chat-launched coding session、plan approval、session lifecycle、worktree isolation、狀態查詢、output 查詢、成本統計與 worktree follow-through。

優點：非常貼合 Sprint 3 的「Discord remote workflow」與「分類 chat session」構想。OpenClaw 可以成為 Discord bridge / remote control plane，讓 URL action confirmation、session routing、completion notification 與使用者 follow-up 留在同一個 channel/thread，不必第一版自製完整 Discord bot。若搭配 Codex CLI / App，它也可以重用目前已登入的 ChatGPT auth 與本機 coding agent 能力。

風險：OpenClaw 是 gateway / orchestrator，不是本專案的 domain policy broker。`openclaw-code-agent` 目前文件偏 GitHub PR follow-through，GitLab MR、`glab mr create --draft`、product JSON schema validation、diff scope check、禁止 merge、禁止 push main 等規則仍需由本專案自製 broker/action 或 worker prompt 補上。導入 OpenClaw 也會增加遠端入口 attack surface，必須先設定 channel allowlist、DM pairing、sandbox、工作目錄隔離與 secrets boundary。

判斷：適合作為「Discord 入口與 session control plane」的候選，不建議作為第一個「agent 建 GitLab MR」spike 的必要前置。最快驗證仍是先用 Codex CLI / App 或 opencode 在 isolated worktree 產生 docs-only 或 product JSON sample，再用 `glab` 建 MR；若 workflow 值得接 Discord，再導入 OpenClaw 來承接 channel routing 與 session observability。

### 方案 H：Hermes Agent persistent agent（新增候選）

Hermes Agent 是 Nous Research 的 open-source persistent personal agent。官方定位不是 IDE-bound coding copilot，而是可長時間運作、具備記憶與 skills learning loop 的 autonomous agent。它支援 CLI、messaging gateway、20+ platform、memory system、skills system、MCP、cron、voice、subagents 與多種 terminal backends，例如 local、Docker、SSH、Daytona、Singularity、Modal。Hermes 可使用 Nous Portal、OpenRouter、OpenAI 或自訂 endpoint，也可從 OpenClaw migration 匯入設定、memory、skills 與 API keys。

優點：非常適合 Sprint 3 的「category-level research thread」與「長期偏好記憶」。例如 `#廚房家電` 可以讓 Hermes 累積品牌、規格、價格帶、避雷點與推薦語氣，再把穩定偏好整理成 rules / memory / docs。Hermes 的 memory / skills 機制比單純長 thread 更適合長期研究。

風險：Hermes 的自我改善、memory 與 skill creation 對本專案是一把雙面刃。若它直接握有 GitLab token 或直接操作 repo，審核邊界會比 Codex / opencode 單次 draft job 更難控。它不是專門為 GitLab MR follow-through 設計，product JSON schema validation、diff scope check、draft-only MR、禁止 merge 等仍需外部 orchestrator 或 broker。長期 memory 也可能保存商品來源、偏好與工作脈絡，需避免保存 secrets 或未授權資料。

判斷：適合作為「長期研究與偏好記憶」的候選，不建議作為第一個 Git-backed content MR spike 的主 backend。若未來 Discord 分類研究真的需要跨週期記憶，Hermes 可放在 category research layer；draft job 仍應由 isolated worktree 中的 Codex / opencode / Pi 或受控 broker 執行。

### 方案 I：opencode serve / SDK control plane（已選主路徑）

使用 `opencode serve` 在本機或測試 VM 啟動 headless server，input bridge 透過 HTTP API 或 `@opencode-ai/sdk` 建立 / resume / fork session、送出 message、訂閱 `/event` SSE、讀取 `/session/:id/message`、`/session/:id/diff`、`/file/status`，並在需要時回覆 `/session/:id/permissions/:permissionID`。Discord 是第一個 input adapter，但不是唯一入口。對 one-shot spike，可先用 `opencode run --format json --session <id> --attach <server> --dir <worktree>` 當 subprocess 取得 raw JSON events。

優點：opencode 的 server / SDK 是為多 client 與 programmatic control 設計，session id 可直接存進 bridge mapping；`prompt_async` 與 SSE events 適合把進度回報到 Discord thread 或其他入口；`--dir` 可指向 isolated worktree；permission / agent config 可限制 `edit`、`bash`、`external_directory`，並明確 deny `glab mr merge`、`git push origin main`、`git reset --hard` 等危險 command。`opencode run --attach` 也能連到既有 server，避免每次 subprocess 都冷啟動 MCP / server。

風險：opencode 不是 DW嚴選的 domain policy broker。官方 GitLab 整合偏 GitLab CI / Duo runner，未包含 product JSON schema validation、diff scope check、draft-only MR 或禁止 merge 的專案規則。若 server 暴露到非 localhost，必須設定 Basic Auth、CORS allowlist 與網路邊界，否則 Discord bridge 會變成遠端 agent 控制面。本機測試中 `opencode export --sanitize` 不適合作為 automation contract；Discord bridge 應依 OpenAPI / SDK、SSE events、message API 與 diff API，而不是 parse export transcript。`--dangerously-skip-permissions` 不應用於本專案。

判斷：server / SDK 是 Sprint 3 control plane 主路徑，CLI `run --format json` 只作 first spike 或 fallback。第一個 MR spike 可以先讓 opencode 在 isolated worktree 產生 docs-only 或 sample product JSON，再由 orchestrator / `glab` 建 MR；正式接 Discord 時再補 input adapter abstraction、session mapping、permission response UI 與 broker guardrails。

2026-06-02 headless smoke test：已實測兩種 headless 多輪路徑。第一，`opencode run --format json --session <session_id>` 可用同一 session id 送第二輪訊息，第二輪能回憶第一輪 assistant output。第二，`opencode serve` 的 HTTP API 可 `POST /session` 建 session，再用同一個 `POST /session/:id/message` 送兩輪，第二輪同樣能回憶第一輪 output。完整 conversation 可用 `opencode export <session_id>` 取回，也可透過 `GET /session/:id/message` 取回 messages 與 parts。這代表 input bridge 可把 `opencode_session_id` 作為長期 mapping key，並在需要時重建 thread transcript 或摘要。

## OpenAI subscription / Codex 可用性

官方文件顯示，Codex 目前包含在 ChatGPT Free、Go、Plus、Pro、Business、Edu、Enterprise plans。Plus 文件定位為每週少量 focused coding sessions；Pro 提供比 Plus 更高的 usage limits；Business 可使用 standard ChatGPT seats 或 usage-based Codex seats；Enterprise / Edu 可用企業控制與 credits 擴充。

Codex auth 有兩種主要路徑：

- Sign in with ChatGPT：使用 ChatGPT subscription entitlement 與 ChatGPT workspace policy。Codex cloud 必須用 ChatGPT sign-in；Codex CLI、IDE extension、Codex app 可使用此模式。
- API key：使用 OpenAI Platform API usage-based billing。適合 CI、private runner、programmatic automation；但沒有 ChatGPT credits、cloud-based GitHub review、Slack 等部分 cloud features，且新模型可能較晚開放。

本機檢查結果：

- `codex` 已安裝，版本為 `codex-cli 0.136.0`。
- `codex login status` 顯示 `Logged in using ChatGPT`。
- `codex doctor` 顯示 auth mode 為 `chatgpt`，有 stored ChatGPT tokens，沒有 stored API key。
- `codex doctor` 的 websocket / reachability 檢查通過，ChatGPT backend 可連線。
- `codex doctor` 不會顯示目前 ChatGPT plan 名稱、剩餘 usage limits 或 credits；這些需在 Codex usage dashboard 或 CLI active session 的 `/status` 查。

對本專案的含義：第一個 local Codex spike 可以直接使用目前 ChatGPT sign-in，不需要先建立 OpenAI API key。若後續要讓 Discord bot、OpenClaw、Hermes 或 CI runner 長期自動執行，應優先考慮 API key 或 Enterprise access token，避免把個人 ChatGPT session token 複製到不受控環境。`~/.codex/auth.json` 可能含 access tokens，應視為 secret，不可 commit、不可貼到 issue 或 Discord。

## Agentic Flow 草案

```text
input adapter 收到商品 URL
→ bridge 對應或建立 opencode category session
→ 使用者選擇研究 / 建 draft / 比價 / 忽略
→ 建立 isolated branch 或 worktree
→ 呼叫 opencode draft job session
→ 載入 dwselect draft skill、product schema 與 workflow rules
→ agent 抓頁、整理資訊、產生 product JSON
→ optional schema validation 或人工確認
→ 通過後 commit branch
→ push branch
→ GitLab MR broker / glab 建 MR
→ input channel 回報 MR link
→ 使用者 review / edit / merge
→ GitLab CI/CD rebuild Nuxt SSG
```

## 安全邊界

- Agent 不直接操作 `main`。
- Agent 不直接 merge MR。
- 長期目標是避免 agent 持有可 merge 的 GitLab token；第一個 spike 可先使用已登入的 `glab` 或 control plane 建 MR，但明確不執行 merge。
- GitLab token、branch push、MR 建立長期可由 orchestrator 控制；第一版先以能穩定建立 MR 為目標。
- agent session 在 isolated branch 或 worktree 中執行。
- schema validation 可作為後續自動化 guardrail；第一版可先依賴 MR review。
- LLM output 必須是 draft，不能直接發布。
- 第一版可讓 agent / control plane 建立 MR，但不應讓它直接 merge 或 push main。
- `glab` broker / action、diff scope check、command allowlist 與 hooks / permission profiles 是後續安全加強，不是第一個 spike 的必要條件。
- 若使用 `opencode serve`，Discord bridge 應明確指定 `--port`，綁定 `127.0.0.1` 或受控內網，並設定 `OPENCODE_SERVER_PASSWORD`。
- opencode session 不應啟用 auto-share；若 session 可能含 repo context、商品來源或 secrets，應將 share 設為 `disabled` 或保留 manual。
- 不使用 `opencode run --dangerously-skip-permissions`。
- Discord bridge 不應 parse `opencode export` transcript 作為狀態來源；應使用 server `/event`、`/session/:id/message`、`/session/:id/diff` 與 SDK 型別。

## 需要驗證的項目

### Pi runtime 驗證

- 能否在本機穩定安裝並執行 `pi --mode rpc`。
- RPC JSONL framing 是否能在 Node orchestrator 中穩定 parse。
- 能否設定 model、thinking level、session dir、tools allowlist。
- 能否在 headless 模式處理 extension UI request，例如 confirm/input。
- session JSONL 是否足夠用於 debug 與 audit。

### Agent 工作能力驗證

- 能否穩定讀取商品 URL 的頁面資訊。
- 對動態頁面、反爬、會員價、促銷價、缺貨狀態的處理能力。
- 能否根據固定 schema 輸出可 parse 的 product JSON。
- 能否遵守「只產生 draft，不上架、不 merge」的限制。
- 能否在同一任務中產生推薦文、tags、category 與 reference。

### Git workflow 驗證

- local orchestrator 能否建立 isolated branch 或 worktree。
- agent 修改是否能限制在 `content/products/` 與必要 metadata。
- schema validation 失敗時是否需要阻止 commit/MR，或先只在 MR 中標註風險。
- GitLab branch push 與 MR 建立是否能用 `glab` 或 GitLab API 穩定完成。
- MR 描述是否能包含商品摘要、來源 URL、風險與驗證結果。

### Codex App / app-server 驗證

- Codex App worktree thread 能否穩定在本專案 repo 中建立 isolated worktree。
- Codex App local environments 能否定義 `validate product JSON` 與 `create draft MR` actions。
- Codex app-server 或 SDK 能否從 Discord bridge 建立、resume、archive category research thread。
- app-server 是否能可靠保存 `thread_id`，對應 Discord `channel_id` 或 `thread_id`。
- Codex permission profiles 能否限制 filesystem、network 與 secrets read access。
- Codex hooks 能否攔截或阻擋危險 command，尤其是 `glab mr merge`、`git push origin main`、破壞性 Git 指令。
- `glab` 在 Codex sandbox / worktree 中能否只取得必要 GitLab 權限並成功建立 draft MR。

### T3 Code 驗證

- 能否在本機穩定跑 `npx t3` 或 desktop app，並連上已登入的 Codex CLI。
- 能否在 DW嚴選 repo 中建立 / resume 對應 session，且 session cwd 可控。
- GitLab source control provider 能否偵測 `origin` 的 GitLab remote，並用已登入的 `glab` 建立 MR。
- 能否建立 GitLab MR，並回傳 MR URL。
- 是否支援 draft MR；若不支援，第一版可接受一般 MR 搭配人工 review。
- 是否值得插入 `dwselect-create-draft-mr` 這類 action，或直接使用一般 `createChangeRequest` 即可。
- T3 Code server / WebSocket protocol 是否適合被 Discord bridge 呼叫，或只適合作為人類 dashboard。
- 若需 fork T3 Code，維護成本是否高於直接使用 Codex app-server / SDK。

### OpenClaw 驗證

- 能否在本機或測試 VM 安裝 `openclaw` 並啟動 Gateway / Control UI。
- 能否把 Discord channel 綁到特定 agent workspace，並保留 channel / thread routing。
- 能否用 `coding-agent` skill 或 `openclaw-code-agent` plugin 啟動 Codex / opencode background worker。
- 能否強制 worker 使用 isolated worktree / branch，而不是直接改主工作區。
- 能否把 draft job completion、失敗、需要使用者決策等狀態回報到原 Discord thread。
- 能否避免 agent 直接執行 `glab mr merge`、`git push origin main` 或讀取 secrets。
- GitLab MR 是否要由 OpenClaw plugin 自行支援、由 worker 直接呼叫 `glab`，或由本專案 broker/action 統一處理。

### Hermes Agent 驗證

- 能否在本機、VPS 或 isolated container 中穩定安裝並啟動 Hermes。
- 能否建立 category-level persistent memory，並讓 `/clear` 或 reset 不刪除穩定 rules / memory。
- 能否限制 Hermes 只做 research / comparison，不直接寫 repo 或操作 GitLab。
- 能否把穩定偏好輸出成 repo 內 docs/rules，而不是只留在 Hermes memory。
- 若讓 Hermes 觸發 draft job，是否能把 draft job 委派給 isolated Codex / opencode worker 或 broker。
- 如何審計 Hermes 自動建立或更新的 skills，避免 prompt / memory 漂移破壞工作流。

### opencode session / Discord bridge 驗證

- 已確認本機 `opencode` 版本為 `1.15.13`，支援 `run`、`serve`、`web`、`session`、`export`、`attach`、`acp` 等子命令。
- 已確認 `opencode run` 支援 `--format json`、`--session`、`--continue`、`--fork`、`--attach`、`--dir`、`--agent`、`--model`、`--file` 與 `--title`。
- 已確認 `opencode session list --format json` 可取得 session id、title、updated、created、projectId 與 directory。
- 已確認 `opencode serve --port <port> --hostname 127.0.0.1` 可回應 `/global/health`，本機回傳 `version = 1.15.13`。
- 已確認 `opencode run --format json --session <session_id>` 可在同一 session id 送多輪對話，且後續回合可讀到前一輪 assistant output。
- 已確認 `opencode serve` HTTP API 可 `POST /session` 建 session，再用同一個 `POST /session/:id/message` 送多輪對話，且後續回合可讀到前一輪 assistant output。
- 已確認 `opencode export <session_id>` 可輸出完整 session JSON，top-level 包含 `info` 與 `messages`，可抽出 user / assistant role、message id、part types 與 text。
- 已確認 `GET /session/:id/message` 可透過 headless server 取回完整 messages / parts transcript。
- 需驗證 `opencode serve` / SDK 的 `POST /session/:id/prompt_async`、`GET /event`、`GET /session/:id/diff` 是否足夠讓 Discord thread 顯示進度、完成摘要與 diff 連結。
- 需驗證 permission request event 能否透過 Discord button 轉成 `/session/:id/permissions/:permissionID` response。
- 需驗證 `--dir <worktree>` 或 server cwd strategy 能否穩定讓每個 draft job 使用 isolated worktree，而不是主工作區。
- 需驗證 project-local opencode agent / permission config 能否 deny `glab mr merge`、`git push origin main`、`git reset --hard`、secrets read 與外部目錄寫入。
- 需驗證 `opencode run --format json --attach <server>` raw event stream 是否足夠作為 first spike 的 CLI subprocess 進度來源。
- 需驗證 opencode GitLab CI / Duo flow 是否只作參考；本專案 local MR spike 仍以 `glab` broker / action 建立 MR。

### OpenAI subscription / Codex auth 驗證

- `codex login status` 能否維持 ChatGPT sign-in。
- `codex doctor` 是否維持 websocket / reachability 通過。
- Codex usage dashboard 是否顯示目前 plan、剩餘 limits 與 credits。
- 使用 ChatGPT sign-in 跑 local `codex exec` 是否可完成最小 sample draft。
- 若要 automation，是否改用 OpenAI API key 或 Enterprise access token。
- `~/.codex/auth.json` 是否避免被 worker、Discord log、MR description 或 CI artifact 泄漏。

### Input adapter / Discord session 驗證

- 一個 Discord 分類頻道是否適合對應一個長期 category research thread。
- URL detected 後，bot 能否先詢問「研究、建 draft、比價、忽略」，避免誤建 draft。
- `/clear` 能否只 archive / reset agent thread，不刪 Discord 訊息、不影響既有 MR。
- 長期偏好是否需要寫入 rules / memory / docs，而不是只依賴長 thread。
- Bridge contract 是否能讓 Discord、CLI、Web UI 或 inside admin 共用同一套 opencode session routing。

### 可替換性驗證

- 同一個 draft job interface 是否能接 Pi 或 opencode。
- agent output contract 是否能獨立於特定 agent runtime。
- 若 Pi 不適合，是否能保留 orchestrator、schema validation 與 GitLab MR workflow。

## 建議的 Spike 順序

1. 用手動 prompt 跑一次 Pi RPC，確認能完成簡單檔案產出。
2. 建立最小 Node RPC client，只送 prompt、收 event、等待 `agent_end`。
3. 在 temporary branch 中要求 Pi 產生一個 sample product JSON。
4. 視需要用 schema validation 檢查 JSON，或先以人工 review 驗收。
5. 用本機 Git 操作產生 commit，但暫不 push。
6. 驗證 `glab` 或 GitLab API 建 MR 的最小流程。
7. 比較同一 task 用 opencode 走同樣 contract 的可行性。

2026-06-02 更新後的建議 spike 順序：

1. 選一條最快路徑讓 agent 在 isolated worktree / branch 中產生 sample product JSON；目前優先使用已可用的 Codex CLI / App 或 opencode，不把 OpenClaw / Hermes 作為第一步必要前置。
2. 讓 agent 或 control plane 建立 GitLab MR，並回傳 MR URL。
3. 以 opencode serve / SDK 作為主路徑，驗證 bridge mapping、event streaming、permission response 與 MR broker 的最小 glue code。
4. 確認 agent 不能直接 merge 或 push main。
5. 若 MR 建立流程可行，再補 schema validation、diff scope check、draft-only MR、hooks / permission profile。
6. 若 Discord 操作體驗成為主要需求，再 spike OpenClaw 作為 channel gateway / session control plane。
7. 若長期 category research / 偏好記憶成為主要需求，再 spike Hermes Agent 作為 research layer。
8. 若 opencode control plane 遇到阻塞，再評估 Codex app-server / SDK、T3 Code 或 Pi RPC 作為 fallback。

## Search 技術調研（Sprint 2）

### 已決策

- 前端元件：Nuxt UI `UInputMenu`，header 內嵌搜尋列 + 下拉建議。`ignoreFilter` + `v-model:search-term` 接 MiniSearch。
- 搜尋引擎：MiniSearch（~5.8 kB gzip），build-time 產生 index JSON，client 端 lazy load + `loadJSON()` 還原。
- CJK 分詞：`Intl.Segmenter('zh-Hant', { granularity: 'word' })` 為主，bigram 為 fallback。`Intl.Segmenter` 已是 Baseline（2024），所有主流瀏覽器支援。
- 排除方案：Fuse.js（無 index、暴力掃描）、FlexSearch（CJK bug）、Lunr.js（停滯）、外部服務（100–500 筆商品 overkill）。

### Nuxt UI 搜尋元件摘要

| 元件 | 用途 | 備註 |
|------|------|------|
| `UCommandPalette` | 搜尋 overlay（Cmd+K） | Fuse.js fuzzy、分組、keyboard nav、虛擬化 |
| `UDashboardSearch` | CommandPalette + Modal | 自帶 Cmd+K 快捷鍵 |
| `UContentSearch` | Nuxt Content 整合搜尋 | 吃 `queryCollectionSearchSections()` |
| `UInputMenu` | 內嵌 autocomplete（已選定） | Reka UI Combobox、`ignoreFilter` 接外部搜尋 |
| `UInput` | 基本輸入框 | 無下拉建議，僅適合觸發導航 |

`UInputMenu` 關鍵 props：`items`、`v-model:search-term`、`ignoreFilter`、`loading`、`filterFields`、`openOnFocus`、`virtualize`。支援 `#item`、`#item-leading`、`#item-label`、`#empty` 等 slots。

### 搜尋函式庫比較

| 項目 | MiniSearch | Fuse.js | FlexSearch | Lunr.js |
|------|-----------|---------|------------|---------|
| Bundle（gzip） | ~5.8 kB | ~7 kB | 4.5–16 kB | ~8.3 kB |
| 搜尋方式 | Inverted index（TF-IDF） | 暴力掃描（Bitap） | Contextual index | Inverted index |
| CJK | 需自訂 tokenizer | 最佳（內建 Unicode） | 有 bug | 需外掛 |
| Build-time index | `toJSON()` / `loadJSON()` | 不支援 | `export()` / `import()` | 支援 |
| Fuzzy | 有 | 最強 | 有 | 有 |
| Prefix / 自動建議 | 有 | 無 | 有 | 無 |

### MiniSearch + SSG 工作流

```text
nuxt generate 時：
1. 讀取所有商品 JSON（queryCollection 或直接 fs）
2. 建立 MiniSearch instance，設定 fields + CJK tokenizer
3. miniSearch.addAll(products)
4. JSON.stringify(miniSearch.toJSON()) → /public/search-index.json

客戶端：
1. 使用者 focus 搜尋框 → lazy fetch /search-index.json
2. MiniSearch.loadJSON(json, options) → 還原 index
3. 即時搜尋，回傳結果餵給 UInputMenu
```

預估 index 大小：100–500 筆商品，gzip 後約 50–150 KB。

### CJK Tokenizer 策略

`Intl.Segmenter` 做主力，bigram 做 fallback：

```javascript
function cjkTokenizer(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('zh-Hant', { granularity: 'word' })
    return [...segmenter.segment(text)]
      .filter(s => s.isWordLike)
      .map(s => s.segment)
  }
  // fallback: bigram for CJK chars, whitespace split for others
}
```

### 搜尋演算法筆記

| 演算法 | 用途 | 對繁中商品的適用性 |
|--------|------|-------------------|
| TF-IDF / BM25 | 排名 | 高——商品描述中的獨特用語得到較高權重 |
| N-gram（bigram） | CJK 分詞 | 高——無字典、能處理未知詞彙 |
| Prefix Tree | 即時建議 | 中高——輸入「辦」即顯示「辦公椅」 |
| `Intl.Segmenter` | 瀏覽器原生分詞 | 中——品質依引擎實作，但已是 Baseline |
| Levenshtein Fuzzy | 容錯 | 低——對中文字元間比較無語意意義 |

### 參考來源

- Nuxt Content Full-Text Search：`https://content.nuxt.com/docs/advanced/fulltext-search`
- Nuxt UI CommandPalette：`https://ui.nuxt.com/docs/components/command-palette`
- Nuxt UI InputMenu：`https://ui.nuxt.com/docs/components/input-menu`
- Nuxt UI ContentSearch：`https://ui.nuxt.com/docs/components/content-search`
- MiniSearch：`https://github.com/lucaong/minisearch`
- Fuse.js：`https://www.fusejs.io/`
- Intl.Segmenter MDN：`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter`

## 不在目前階段驗證

- 完整 Discord bot 長期部署。
- Codex App deep integration UI。
- T3 Code fork / custom extension。
- OpenClaw gateway 長期部署。
- `openclaw-code-agent` GitLab MR follow-through extension。
- Hermes Agent 長期 category memory 部署。
- opencode Discord bridge productionization。
- pi-agent-dashboard 長期部署。
- 自製 Pi extension/package。
- 價格監控與通知。
- 多 agent parallel workflow。

## 參考來源

- `https://pi.dev/docs/latest`
- `https://pi.dev/docs/latest/sdk`
- `https://pi.dev/docs/latest/rpc`
- `https://pi.dev/docs/latest/json`
- `https://pi.dev/docs/latest/skills`
- `https://github.com/earendil-works/pi`
- `https://github.com/qualisero/awesome-pi-agent`
- `https://github.com/BlackBeltTechnology/pi-agent-dashboard`
- `https://github.com/dcai/discord-pi-agent`
- `https://developers.openai.com/codex/changelog`
- `https://developers.openai.com/codex/app/features`
- `https://developers.openai.com/codex/app/worktrees`
- `https://developers.openai.com/codex/app/local-environments`
- `https://developers.openai.com/codex/app/review`
- `https://developers.openai.com/codex/app/automations`
- `https://developers.openai.com/codex/app-server`
- `https://developers.openai.com/codex/permissions`
- `https://developers.openai.com/codex/hooks`
- `https://t3.codes/`
- `https://github.com/pingdotgg/t3code`
- `https://raw.githubusercontent.com/pingdotgg/t3code/main/AGENTS.md`
- `https://raw.githubusercontent.com/pingdotgg/t3code/main/apps/server/src/sourceControl/GitLabCli.ts`
- `https://raw.githubusercontent.com/pingdotgg/t3code/main/apps/server/src/sourceControl/GitLabSourceControlProvider.ts`
- `https://docs.openclaw.ai/`
- `https://docs.openclaw.ai/cli/agents`
- `https://github.com/openclaw/openclaw`
- `https://raw.githubusercontent.com/openclaw/openclaw/main/README.md`
- `https://raw.githubusercontent.com/openclaw/openclaw/main/skills/coding-agent/SKILL.md`
- `https://github.com/goldmar/openclaw-code-agent`
- `https://raw.githubusercontent.com/goldmar/openclaw-code-agent/main/README.md`
- `https://hermes-agent.nousresearch.com/docs/`
- `https://github.com/NousResearch/hermes-agent`
- `https://raw.githubusercontent.com/NousResearch/hermes-agent/main/README.md`
- `https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan`
- `https://developers.openai.com/codex/pricing`
- `https://developers.openai.com/codex/auth`
- `https://developers.openai.com/codex/cli`
- `https://developers.openai.com/codex/ide`
- `https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-freegopluspro-sora`
- `https://help.openai.com/en/articles/20001106-codex-rate-card`
- `https://help.openai.com/en/articles/8792536-managing-billing-and-seats-in-chatgpt-business`
- `https://opencode.ai/docs/cli`
- `https://opencode.ai/docs/server`
- `https://opencode.ai/docs/sdk`
- `https://opencode.ai/docs/gitlab`
- `https://opencode.ai/docs/permissions`
- `https://opencode.ai/docs/agents`
- `https://opencode.ai/docs/share`
- `https://opencode.ai/docs/policies`
