# Works：Git-backed Content Roadmap

## 2026-06-02

> 2026-06-05 後，provider 主線已改為 GitHub / PR / GitHub Actions；本日誌中 GitLab / MR / `glab` 相關內容保留為當時研究與決策脈絡。

### 目前狀態

- 已確認 `002-git-backed-content-roadmap` 是新的 umbrella roadmap，supersede `001-revamp` 的 Google Sheets TSV runtime 資料來源假設。
- 已選定 Content-first 方向：Nuxt SSG、Nuxt Content、Git-backed JSON content、GitLab MR review、CI/CD rebuild。
- 商品資料傾向每商品一個 `content/products/*.json`，`main` 保存全部商品，前台只顯示 `status = "published"`。
- LLM / agent 不直接 merge，不直接上線商品，所有 draft / 上架 / 下架仍經 GitLab MR 人工審核。
- Discord remote workflow 目前傾向 Category Session：一個分類頻道對應一個長期 opencode category session。
- 已決定 Sprint 3 主路徑採 `Discord input adapter + opencode control plane + GitLab MR broker`；Discord 只是訊息入口之一，核心 workflow 不綁死 Discord。
- URL 預設不直接建 draft；bot 先詢問「研究、建 draft、比價、忽略」。
- `/clear` 的語意是封存或重開該分類的 agent context，不刪 Discord 訊息、不刪已產生 draft、不關閉既有 MR。
- Draft job 應與長期 category research thread 分開，在 isolated worktree / branch 中產生 product JSON 與 MR。

### Codex App 再評估

- 最近重新檢查 Codex 文件後，Codex App 已列為主要候選，不再只是人工輔助 UI。
- Codex App 目前支援 worktree mode、integrated terminal、local environments、actions、Git diff / commit / push / PR、automations、remote control、app-server JSON-RPC、Codex SDK、permission profiles、hooks 與 auto-review。
- 對本專案來說，主要缺口已轉為：如何讓 Codex 在受控 worktree / sandbox 中安全操作 GitLab workflow，尤其是 `glab`。
- GitLab 不是 Codex App first-class integration，因此 GitLab MR 建立需靠 `glab`、GitLab API，或自製 broker。
- 使用者已放寬第一版安全要求：目前優先證明 agent 能建立 MR；受控 action，例如 `dwselect-create-draft-mr`，可留到後續安全加強。

### T3 Code 評估

- T3 Code 是 early WIP 的 coding-agent control plane / minimal web GUI，支援 Codex、Claude、OpenCode，但需要先安裝並登入對應 provider CLI。
- 架構上 `apps/server` 是 Node.js WebSocket server，包裝 `codex app-server` JSON-RPC over stdio；`apps/web` 是 React/Vite UI。
- Repo 內已有 source control provider abstraction，且包含 GitLab support；GitLab provider 透過 `glab` 做 auth discovery、list / view / create merge request。
- T3 Code 的 GitLab MR 建立目前屬於一般 source control provider 能力，未看到 schema validation、diff scope check、draft-only enforcement、禁止 merge 等專案 guardrails；但這些不阻塞第一個 MR spike。
- 判斷：T3 Code 可作為第一個「agent 建 MR」候選路徑，也可作為 inside dashboard 或 Codex app-server client 的參考實作。

### OpenClaw / Hermes Agent 再評估

- OpenClaw 官方定位是 self-hosted multi-channel gateway for AI agents，支援 Discord、Telegram、Slack、WhatsApp 等 channel、Control UI、multi-agent routing、agent workspace、skills、DM pairing / allowlist 與 sandbox 設定。
- OpenClaw 適合 DW嚴選 Sprint 3 的 Discord remote workflow：從 Discord 收 URL、在原 thread 做 action confirmation、啟動 background coding worker、回報完成或需要決策。
- `openclaw-code-agent` plugin 更貼近 coding session orchestration，提供 plan approval、session lifecycle、worktree isolation、output / stats 查詢與 worktree follow-through；但目前文件偏 GitHub PR，GitLab MR、`glab`、product JSON schema validation、diff scope check、draft-only MR 與禁止 merge 仍需本專案 broker/action 補上。
- Hermes Agent 是 Nous Research 的 persistent personal agent，重點是 memory、skills learning loop、messaging gateway、MCP、cron、subagents 與多 terminal backends。
- Hermes 適合 category-level research thread 與長期偏好記憶，例如分類頻道累積品牌、規格與語氣偏好；但不適合作為第一個 GitLab MR spike 的主 backend，因為 self-improving memory / skills 會增加審核與安全邊界複雜度。
- 判斷：OpenClaw 可放在 Discord gateway / session control plane；Hermes 可放在長期 research memory layer；第一個 MR spike 仍建議先用 Codex CLI / App、opencode 或 T3 Code 走 isolated worktree + `glab`。

### OpenAI subscription 可用性

- OpenAI 官方文件顯示 Codex 已包含於 ChatGPT Free、Go、Plus、Pro、Business、Edu、Enterprise plans；Plus / Pro 可用 ChatGPT credits 擴充，Business 可使用 standard ChatGPT seats 或 usage-based Codex seats。
- Codex 支援兩種 OpenAI auth：ChatGPT sign-in 用 subscription entitlement；API key 用 OpenAI Platform usage-based billing。Codex cloud 必須用 ChatGPT sign-in；CLI / IDE extension 可用兩者。
- 本機 `codex` 版本為 `codex-cli 0.136.0`，`codex login status` 顯示已用 ChatGPT 登入。
- `codex doctor` 顯示 auth mode 為 `chatgpt`，有 stored ChatGPT tokens、沒有 stored API key，websocket / reachability 通過。
- `codex doctor` 不會顯示目前 ChatGPT plan 名稱或剩餘 usage limits；這些需到 Codex usage dashboard 或 active CLI session 的 `/status` 查。
- `~/.codex/auth.json` 可能含 access tokens，後續若接 OpenClaw、Hermes、Discord bot 或 CI runner，不能把這個檔案當一般設定檔傳遞或記錄。

### 本機環境檢查

- `glab` 已安裝並登入 `gitlab.com`，帳號為 `applepig81`。
- `glab repo view` 可讀取目前 repo：`gitlab.com/applepig81/dwselect`。
- `codex` 已安裝，版本為 `codex-cli 0.136.0`，支援 `exec`、`app-server`、`remote-control`、`sandbox` 等子命令。
- `opencode` 已安裝，版本為 `1.15.13`，支援 `run`、`serve`、`web`、`session` 等子命令。
- `t3` CLI 未安裝，但本機已有 `bun` 與 `pnpm`，後續可用 `npx t3` 或安裝 desktop app 評估。
- 目前最快 MR spike 不需要先導入 T3 Code：可先用 Codex CLI / App 或 opencode 產生變更，再用已登入的 `glab` 建立 MR。

### opencode session 控制評估

- 本機 `opencode` 版本為 `1.15.13`，CLI 支援 `run --format json`、`--session`、`--continue`、`--fork`、`--attach`、`--dir`、`--agent`、`--model`、`--file` 與 `--title`，適合做 one-shot draft spike 或 subprocess fallback。
- `opencode session list --format json` 可取得 session id、title、projectId、directory、created、updated，足以建立 Discord thread 到 opencode session 的初始 mapping。
- `opencode serve` 提供 HTTP OpenAPI 與 JS SDK，可建立 session、送同步 / 非同步 message、訂閱 SSE events、讀 messages / diff / file status、處理 permission request，比 CLI subprocess 更適合 Discord bridge 長期控制面。
- 本機短暫啟動 `opencode serve --port 48763 --hostname 127.0.0.1` 後，`/global/health` 回傳 `healthy = true`、`version = 1.15.13`。CLI help 顯示 serve 預設 port 是 `0`，後續 bridge 必須明確指定 port，不應假設官方文件中的 `4096`。
- opencode GitLab 文件主要描述 GitLab CI component 與 GitLab Duo runner flow，不等於本機 GitLab MR broker；DW嚴選仍需 `glab` broker / action 負責 product JSON schema validation、diff scope check、draft-only MR 與禁止 merge。
- `opencode export --sanitize` 可作人工 audit 參考，但不應作為 Discord automation contract；bridge 應使用 server OpenAPI / SDK、SSE events、message API 與 diff API。
- 安全邊界：`opencode serve` 應綁定 `127.0.0.1` 或受控內網、設定 Basic Auth、避免 auto-share、禁止 `--dangerously-skip-permissions`，並用 permission / agent config deny `glab mr merge`、`git push origin main`、`git reset --hard` 與 secrets read。
- 判斷：若 Sprint 3 選 opencode，主路徑應是 `opencode serve` + SDK / HTTP API；`opencode run --format json` 只用於第一個 MR spike 或 fallback。

### opencode headless smoke test

- 測試目錄使用 `/tmp/opencode/dwselect-headless-smoke`，避免碰 repo 工作區。
- CLI headless 路徑：`opencode run --pure --format json --dir <tmp> --title <title>` 建立 session `ses_177b2a455ffeOibYOSJv1FOV9H`，第一輪回覆 `TURN_ONE_OK`。
- 同一 CLI session 第二輪使用 `opencode run --pure --format json --dir <tmp> --session ses_177b2a455ffeOibYOSJv1FOV9H`，模型回覆 `PREVIOUS=TURN_ONE_OK;TURN_TWO_OK`，確認同一 session id 可續談且有前文。
- CLI transcript 路徑：`opencode export ses_177b2a455ffeOibYOSJv1FOV9H` 可 parse 成 JSON，top-level 是 `info` 與 `messages`，message count 為 4，可抽出兩輪 user / assistant text。
- Server read 路徑：啟動 `opencode serve --pure --port 48764 --hostname 127.0.0.1` 後，`GET /session/ses_177b2a455ffeOibYOSJv1FOV9H/message` 可取回同一串 messages / parts transcript。
- Server write 路徑：啟動 `opencode serve --pure --port 48765 --hostname 127.0.0.1`，`POST /session` 建立 session `ses_177b0cd13ffeHuc3vu1WJ4ZmyF`，同一 session 連續兩次 `POST /session/:id/message` 後第二輪回覆 `PREVIOUS=SERVER_ONE_OK;SERVER_TWO_OK`。
- Server-created session 也可用 `opencode export ses_177b0cd13ffeHuc3vu1WJ4ZmyF` 撈完整 transcript，確認 headless API 建立的 session 有持久化。
- 結論：input bridge 可保存 `opencode_session_id`，用 CLI `run --session` 或 server `POST /session/:id/message` 寫入多輪對話；完整對話可用 `GET /session/:id/message` 作 runtime 讀取，用 `opencode export` 作人工 audit / debug。

### Discord + opencode 架構決策

- 使用者確認繼續採用 Discord + opencode 方案。
- 架構定位：Discord 是 input adapter，不是核心控制面。未來 CLI、Web UI、inside admin、Slack 或 Telegram 都可以用同一個 bridge contract 把訊息送進 opencode。
- 核心控制面：`opencode serve` / SDK 負責 session lifecycle、多輪對話、event streaming、transcript retrieval 與 permission request。
- Domain workflow：draft job 仍在 isolated worktree / branch 產生 content diff；GitLab MR 建立由 `glab` spike 或後續 MR broker 處理。
- 這個切法讓架構維持簡單：input adapter 只處理收訊息、使用者 action、回報結果；opencode 保存 agent session；broker 處理 GitLab / guardrails。

### 後續 guardrail 構想

若第一版 MR 建立流程可行，後續可補 broker / action。可能責任：

- 驗證 product JSON schema。
- 檢查 diff scope，只允許 `content/products/*.json` 與必要 metadata。
- 建立 commit。
- push feature branch。
- 呼叫 `glab mr create --draft`。
- 回傳 MR URL 給 Discord 或 Codex thread。

Broker / action 應禁止：

- `glab mr merge`。
- `git push origin main`。
- `git reset --hard`。
- 修改 secrets 或 `.env`。
- 在已有自動檢查時跳過 schema validation 或 diff scope check。

### 需要重查的 compacted context

- 早期討論中可能有更完整的 CMS survey、inside editing UI 比較、Pi Agent survey 細節，需要在進入 Sprint 2 / Sprint 3 spec 前重新檢查。
- 目前文件已保留已知結論，但尚未重新驗證所有外部工具細節。
- Codex App 能力變化很快，進入 spike 前需要再確認當時版本的 app-server schema、permission profile behavior、hooks interception coverage 與 Linux sandbox 限制。
- 現有 repo 仍是 Vue 3 + Vite，Sprint 1 spec 前需要重新掃描 package、routes、legacy TSV rendering 與 GitLab CI 狀態。

### 下一步候選

- Sprint 1：`spec.md` 已建立，聚焦 Nuxt SSG、Nuxt Content、商品 JSON schema、Google Sheet TSV migration、GitLab CI static generate。
- Sprint 3 spike：以 opencode serve / SDK 為主路徑，讓 opencode 在 isolated worktree / branch 中產生 sample product JSON，並透過 `glab` 或 MR broker 建立 GitLab MR。
- OpenClaw spike：若要先驗證 Discord 操作體驗，可安裝 OpenClaw 並測試 channel binding、background worker、completion route；但不作為第一個 MR spike 的必要前置。
- Hermes spike：若要驗證長期 category research memory，可讓 Hermes 只做 research / preference extraction，不直接操作 GitLab 或 repo。
- Discord / input adapter spike：定義 mapping schema，例如 `adapter_type`、`channel_id`、`thread_id`、`opencode_session_id`、`worktree_path`、`branch_name`、`mr_url`、`status`。
- MR 建立可行後，再決定是否補 schema validation、diff scope check、draft-only MR、`dwselect-create-draft-mr` broker 與 hooks guardrail。
- 若使用者想先看 end-to-end agent MR 能力，可建立一個 spike branch，讓 opencode 新增 docs-only sample，再用 `glab mr create` 建 MR；避免在商品 schema 尚未定案前產生正式商品資料。

### Sprint 1 spec self-review

- Placeholder 掃描：`spec.md` 無 `TBD`、`待確認`、`TODO`。
- 內部一致性：目標、驗收條件、Data Structure、ADR 與 Milestones 均指向 Nuxt SSG + Nuxt Content + Git-backed JSON content。
- Scope 檢查：Sprint 1 不含 inside UI、Discord、agent MR、價格監控、Wishlist、Dark Mode、進階篩選與 modal。
- 歧義檢查：部署範圍明確限定為 CI test + static generate + artifact，不在 Sprint 1 綁定正式網域或 Pages 設定細節。

## 2026-06-05

### Roadmap 補充決策

- 使用者確認後續 canonical provider 改用 GitHub；文件主線改為 GitHub PR、GitHub Actions 與 `gh` / Git provider PR broker。檢查本機 remote 時發現目前 `origin` 仍指向 GitLab，切換 remote 或 mirror 清理留給後續 Git work，不在本次文件補充中處理。
- 修正 Sprint 3 / Sprint 4 的範圍衝突：Sprint 3 聚焦 inside editing / local workflow 產生可審核 PR；Discord + opencode + PR broker 的 remote draft workflow 放入 Sprint 4。
- Legacy Google Sheets TSV migration 理想上只做一次 cutover export。Sprint 1 spec 補上 `--date YYYY-MM-DD` 固定 cutover date，讓必要 rerun 能產生穩定檔名與 `id`。
- 狀態 timestamp 不在 Sprint 1 建立完整 transition invariant。第一層編輯紀錄先依賴 Git commit history 與 PR review；若後續 inside UI 需要商品內可見歷史，再設計 `status_history` 或 edit log。
- URL validation 補強為只允許 HTTP(S) URL；`javascript:`、`data:` 與相對路徑都不允許。
- Branch / PR 命名策略暫不定案，等進入 inside workflow 或 remote draft workflow spec 時再討論。

### Milestone 1 開發日誌

- Red：新增 `tests/nuxt-smoke.test.ts`，描述 Nuxt Content + static generate baseline 與 `getPublishedProductsQuery()` helper skeleton；執行 `pnpm install && pnpm test` 後，Vitest 可啟動但因 `../nuxt.config` 尚不存在失敗，符合預期。
- Green：建立 `nuxt.config.ts`、`content.config.ts`、`app/app.vue`、`app/pages/index.vue`、`app/utils/get-published-products-query.ts`，並將 scripts 改為 Nuxt / Vitest / generate；加入 Nuxt、Nuxt Content、Vitest、`better-sqlite3`、Vue direct dependency。
- Refactor：將既有 styles 搬到 `app/assets/styles/`，移除 Vue/Vite placeholder runtime path（`src/main.js`、`src/router/*`、`src/views/*`、placeholder store/composable、`vite.config.js` 等），避免公開站繼續依賴 Vite-only entry。
- 驗證：`pnpm test` 通過，1 個 test file、2 個 tests；`pnpm generate` 通過並產生 `.output/public`。過程中處理 Nuxt Content 需要 `better-sqlite3`、pnpm build script 需 rebuild native binding，以及 prerender 需 `vue` direct dependency 的問題。
- 決策：Milestone 1 只建立 products collection skeleton 與 query helper shape，不建立完整 product schema、不新增 migration script、不實作 published-only 首頁與 GitHub Actions。

### Milestone 2 開發日誌

- Red：新增 `tests/product-schema.test.ts` 與 `tests/migrate-google-sheet-products.test.ts`，覆蓋 status enum、HTTP(S) URL validation、timestamp format、固定 cutover date、空白 category、tags 轉換、平台 tags、缺 name、欄位數不符、URL error 與 slug collision；第一次執行 `pnpm test tests/product-schema.test.ts tests/migrate-google-sheet-products.test.ts` 因 `app/utils/product-schema` 與 `scripts/migrate-google-sheet-products` 尚不存在失敗，符合預期。
- Green：建立 `app/utils/product-schema.ts`，由 `content.config.ts` 套用 Nuxt Content schema validation；新增 `scripts/migrate-google-sheet-products.ts`，支援 TSV mapping、固定 `--date YYYY-MM-DD`、穩定 id / filename、HTTP(S) URL 驗證、空白分類預設 `未分類`、空白分隔 tags、PCHome / momo / 美亞 / 日亞平台 tags、缺 name / 欄位數不符 / URL error / slug collision summary；新增 `content/products/2026-06-02-sample-product.json` 作 schema fixture。
- Refactor：整理 `formatMigrationSummary()`，讓 skipped rows、warnings、errors 與 slug collisions 分段輸出；修正 script 使用 Node v24 可直接啟動的 `.ts` import 與 CLI usage 文案，避免新增 `tsx` dependency。
- 驗證：`pnpm test tests/product-schema.test.ts tests/migrate-google-sheet-products.test.ts` 通過，2 個 test files、15 個 tests。完整 `pnpm test` 與 `pnpm generate` 於本 milestone 收尾驗證執行。
- 決策：Milestone 2 僅建立資料 schema、migration 與 sample fixture，不實作 Milestone 3 首頁商品列表、不新增 Milestone 4 GitHub Actions。

### Milestone 3 開發日誌

- Red：新增 `tests/published-products.test.ts`，以 in-test fixture 覆蓋 `published`、`draft`、`unpublished`、`archived` 狀態，並驗證 category grouping 與最小 UI card mapping 不暴露 legacy TSV 欄位名；第一次執行 `pnpm test tests/published-products.test.ts` 因 `app/utils/published-products` 尚不存在失敗，符合預期。
- Green：新增 `app/utils/published-products.ts`，提供 `getPublishedProducts()` 與 `getGroupedPublishedProducts()` pure helper，只輸出已上架商品，依 `category ASC`、`published_at DESC`、`name ASC` 排序，並把 product JSON 欄位映射成首頁 card 所需的 `image`、`name`、`price`、`purchase_link`。
- 首頁：更新 `app/pages/index.vue`，透過 Nuxt Content `queryCollection('products')` 查詢 `status = "published"` 商品，套用 helper 後渲染 category sections 與最小商品卡片，包含圖片、名稱、價格與購買連結。
- 驗證：`pnpm test tests/published-products.test.ts` 通過，1 個 test file、3 個 tests；`pnpm test` 通過，4 個 test files、20 個 tests；`pnpm generate` 通過並產生 `.output/public`。
- 決策：本 milestone 不新增 draft / unpublished / archived content 檔，避免測試 fixture 進入 generate content source；狀態過濾以 pure helper 測試覆蓋，實際首頁 query 也保留 `status = "published"` 條件。

### Milestone 4 開發日誌

- Red：新增 `tests/runtime-google-sheet.test.ts`，驗證 runtime 掃描會忽略 `legacy/`、`docs/`、migration script 與 `tests/`，但會抓出 `app/` 與 `.output/public` 中的 `docs.google.com/spreadsheets`、`pub?output=tsv`、`output=tsv` 指標；第一次執行 `pnpm test tests/runtime-google-sheet.test.ts` 因 `scripts/assert-runtime-google-sheet-clean` 尚不存在失敗，符合預期。
- Green：新增 `scripts/assert-runtime-google-sheet-clean.ts`，提供測試與 CI 共用的 runtime 掃描，掃描 `app/`、`content.config.ts`、`nuxt.config.ts` 與存在時的 `.output/public`，並排除 legacy migration / docs 參考來源；新增 `.github/workflows/static-generate.yml`，在 PR 與 main push 安裝 dependencies、執行 `pnpm test`、`pnpm generate`、runtime Sheet 掃描，並 upload `.output/public` artifact。
- Refactor：更新 `README.md`，移除 Vue/Vite template 文案，補上 local development、migration、static generate 與 runtime Sheet 掃描指令；掃描器避免同一檔案對 `pub?output=tsv` 與 `output=tsv` 重複回報。
- 驗證：`pnpm test tests/runtime-google-sheet.test.ts` 通過，1 個 test file、3 個 tests；`pnpm test` 通過，5 個 test files、23 個 tests；`pnpm generate` 通過並產生 `.output/public`；`node scripts/assert-runtime-google-sheet-clean.ts` 通過，確認公開 runtime 與 build output 不含 Google Sheets TSV 指標。
- 決策：Google Sheets 字串允許保留在 `legacy/`、`docs/`、`scripts/migrate-google-sheet-products.ts` 與測試中，因為它們是 migration input / 參考與驗收工具，不是公開站 runtime；Sprint 1 只新增 artifact workflow，不設定 production deploy、Pages 或 domain。
