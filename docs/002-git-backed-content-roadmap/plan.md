# Git-backed Content Roadmap

## 背景

`001-revamp` 原本假設前台繼續讀取 Google Sheets TSV。後續討論後，新的方向改為以 Git repo 內的 content files 作為商品資料 SSOT，透過 GitHub branch 與 PR 進行 draft、上架、下架與審核，再由 CI/CD 觸發 Nuxt SSG rebuild。

本文件是 umbrella scope 概述，會 supersede `001-revamp` 的資料來源假設。`001-revamp` 保留為歷史文件，不再作為後續資料層與後台 workflow 的依據。

## 粗略目標

- 將商品資料從 Google Sheets TSV 遷移到 Git-backed JSON content。
- 使用 Nuxt SSG 與 Nuxt Content 建立公開站資料層。
- 讓 `main` branch 保存全部商品資料，前台只顯示 `status` 為 `published` 的商品。
- 所有資料變更都透過 GitHub branch 與 PR 進行審核，merge 後觸發 CI/CD rebuild。
- 後續 inside 後台、LLM draft agent、價格監控都以「產生 content diff 與 PR」作為整合介面。
- 保留人工審核，不讓 LLM 直接上線商品。

## 可能的方向

### 方案 A：Content-first（已選定）

先遷移成 Nuxt SSG 與 Nuxt Content，商品資料放在 `content/products/*.json`，再讓 inside 後台與 agent 圍繞 GitHub PR workflow 擴充。

優點：最貼近 GitBook 式 workflow，部署模型簡單，資料有 Git history、PR review 與 rollback。

缺點：第一階段不是動態後台，新增或修改商品需要透過檔案變更與 CI rebuild。

### 方案 B：Workflow-first

先完整定義 branch、PR、draft、上下架與審核規則，再實作 Nuxt Content 與資料遷移。

優點：流程規格較完整，後續 agent 與 inside UI 邊界清楚。

缺點：第一個可驗收成果較慢，容易在流程設計上過早複雜化。

### 方案 C：Agent-first

先讓 local Node agent 能從商品 link 產生 draft branch 與 PR，再回頭整理前台資料層。

優點：最快驗證 LLM draft 的價值。

缺點：資料 schema 尚未穩定時，agent 產出的資料容易需要重工。

## 已決策方向

- `002` 作為新的 umbrella roadmap，supersede `001-revamp` 的資料來源假設。
- 公開站採用 Nuxt SSG。
- 商品資料採用 Git-backed JSON content，而不是自行維護 runtime SQLite。
- Nuxt Content 作為 content collection 與 schema validation layer。
- GitHub 是後續 canonical remote provider，正式文件使用 PR 而不是 MR；目前本機 `origin` 仍指向 GitLab，切換 remote 與 mirror 清理由後續 Git work 處理。
- `main` branch 保存全部商品，不只保存已上架商品。
- 前台只顯示 `status = "published"` 的商品。
- draft、上架、下架、封存都透過 branch 與 PR 審核。
- date prefix 用於檔案排序與人類瀏覽，機器排序仍以 content fields 為準。
- Google Sheets TSV migration 理想上只做一次 cutover export；若因修正 input 需要重跑，必須使用同一個固定 cutover date，避免同一批 legacy 商品因執行日期不同而產生不同檔名與 `id`。
- PR 粒度先保持 changeset-based，不在 umbrella plan 綁死單商品或批次。
- 遠端操作入口傾向 Discord，使用「分類 chat session」而不是「單商品 session」。
- Remote draft workflow 主路徑採 `Discord input adapter + opencode control plane + Git provider PR broker`，並放入 Sprint 4；Sprint 3 聚焦 inside editing / local workflow 產生可審核 PR。Discord 只是訊息入口之一，不是核心 workflow；未來其他入口可共用同一套 opencode session routing 與 PR broker。
- Discord URL 預設不直接產生 draft，bot 先詢問「研究、建 draft、比價、忽略」。
- `/clear` 的語意是重開該分類的 agent context，不刪 Discord 訊息、不刪既有 draft、不關閉既有 PR。
- LLM draft backend 目前優先採 opencode headless mode。Codex App / Codex app-server / Codex SDK、T3 Code、Pi Agent 保留為 fallback 或後續替換點。
- GitHub PR 建立可先用已登入的 `gh` spike；長期應收斂到受控 broker / action，負責 schema validation、diff scope check、draft-only PR 與禁止 merge。

## 高階架構

```text
GitHub repo content files
→ GitHub PR review
→ merge to main
→ GitHub Actions / CI/CD
→ Nuxt SSG rebuild
→ static public site
```

公開站不直接連 Google Sheet，也不直接連自管 SQLite。Nuxt Content 內部可能使用 SQLite dump 或 WASM SQLite 加速查詢，但這是 Nuxt Content 的 implementation detail，不是本專案第一階段要維護的資料庫。

## Content 結構草案

```text
content/
  products/
    2026-06-02-sample-product.json
```

每個商品一個 JSON 檔，避免單一大檔造成 diff 難以 review。檔名使用日期 prefix 加 slug，方便人類排序與 Git diff 瀏覽。實際公開排序仍由欄位控制。

商品欄位草案：

```json
{
  "id": "2026-06-02-sample-product",
  "status": "published",
  "name": "商品名稱",
  "price_text": "NT$ 1,990",
  "description": "推薦文或商品描述",
  "purchase_url": "https://example.com/product",
  "image_url": "https://example.com/product.jpg",
  "category": "未分類",
  "tags": ["tag-a", "tag-b"],
  "reference_url": "https://example.com/reference",
  "created_at": "2026-06-02T00:00:00+08:00",
  "updated_at": "2026-06-02T00:00:00+08:00",
  "published_at": "2026-06-02T00:00:00+08:00",
  "unpublished_at": null,
  "archived_at": null
}
```

`status` 初步狀態集合。這裡的 `draft` 指已通過 PR 合併到 `main`、但尚未公開的 canonical draft；未審核的 LLM 或人工提案仍只是 branch 內容，不算進 `main` 的正式資料狀態。

- `draft`：已進入 repo 的草稿，不公開顯示。
- `published`：公開站顯示。
- `unpublished`：曾經或準備公開，但目前不顯示。
- `archived`：保留歷史，不作為日常編輯對象。

## GitHub PR Workflow 草案

未審核的 LLM 或人工草稿先存在 branch 中。PR 被 merge 後，內容才進入 `main`，但是否公開由 `status` 決定。

建立新商品的流程：

```text
建立 branch
→ 新增 product JSON，通常先是 status=draft
→ 開 PR
→ 人工 review
→ merge 後進入 main
→ 若 status=published，下一次 SSG 後公開顯示
```

上架商品的流程：

```text
建立 branch
→ 將 status 改成 published
→ 更新 published_at 與 updated_at
→ 開 PR
→ merge 後 CI/CD rebuild
```

下架商品的流程：

```text
建立 branch
→ 將 status 改成 unpublished 或 archived
→ 更新對應狀態的 timestamp 與 updated_at
→ 開 PR
→ merge 後 CI/CD rebuild
```

PR 粒度保持彈性。單商品 PR、每日批次 PR、人工選擇批次都可行，後續會依 agent 與 inside UI 能力在各 sprint spec 中定義。

狀態時間欄位先保持輕量，不在 umbrella plan 建立完整狀態機。Git commit 與 PR review 是第一層編輯紀錄；若 inside UI 後續需要在商品頁面內顯示狀態歷史，再設計 `status_history` 或 edit log，而不是在 Sprint 1 強制複雜 transition invariant。

## Discord / Agent Remote Workflow 草案

目前偏好的遠端工作模式是 Category Session：一個 Discord 分類頻道對應一個長期 opencode category session。Discord 只是 input adapter；核心 workflow 由 opencode session routing、isolated draft job 與 Git provider PR broker 組成。相近商品放在同一個頻道裡討論，讓 agent 累積該分類的偏好、比較標準與常見品牌脈絡。

```text
Discord channel（例如 #廚房家電）或其他 input adapter
→ opencode category session
→ URL detected
→ bridge 詢問：研究 / 建 draft / 比價 / 忽略
→ 若選擇建 draft，建立 isolated worktree / branch
→ opencode draft job 產生 product JSON draft
→ 基本檢查或人工確認
→ Git provider PR broker / gh 建 PR
→ 原 input channel 回報 PR link
```

分類 research session 與 draft job 不應混在一起。分類 session 用於長期研究與偏好累積；draft job session 用於一次性產生檔案、驗證與開 PR。這樣可以避免長期對話直接累積未完成的 Git 變更，也方便 `/clear` 只重置研究 context。

```text
#廚房家電 opencode category session
├── draft job：2026-06-02-air-fryer
├── draft job：2026-06-03-coffee-grinder
└── draft job：2026-06-04-rice-cooker
```

`/clear` 應封存或重開該分類的 opencode session，但不刪除 Discord 訊息、不刪除已產生 draft、不關閉已開 PR。若需要保留長期偏好，應將穩定偏好寫入獨立 rules / memory / docs，而不是依賴單一超長 session。

## Roadmap Sprint

### Sprint 1：Git-backed Content Data Layer

目標是移除 Google Sheets TSV 作為前台 runtime 資料來源，建立 Nuxt SSG 與 Nuxt Content 的商品資料層。

範圍包含：Nuxt migration、Nuxt Content collection、Zod schema、Google Sheet TSV migration script、商品 JSON 產出、前台只查 `published`、最小可用首頁、GitHub Actions static rebuild。

範圍不包含：UI 設計、search、inside 後台 UI、LLM draft agent、價格監控、通知。

### Sprint 2：Public Site UI + Search

目標是重做公開站 UI/UX 並加入搜尋功能，讓商品瀏覽體驗達到正式上線品質。

範圍可能包含：UI 重做（根據 Claude Design 設計稿）、商品卡片設計、分類瀏覽、響應式佈局、search panel（前端 UI）、search backend（Nuxt Content 內建搜尋或外部方案）、篩選與排序、View Transition 頁面轉場（商品列表 → 詳情 morph、分類切換、search panel 動畫）。

前置條件：Sprint 1 的資料層與 Nuxt Content 基礎已就位。UI 設計稿在 claude.ai Artifacts 產出後帶入 spec。

### Sprint 3：Inside Editing Workflow

目標是讓商品維護可以透過可操作介面或 local workflow 產生 PR。

範圍可能包含：商品列表、狀態切換、欄位編輯、branch 建立、PR 建立、review 前預覽。

候選方案包含：Pages CMS、Decap CMS、自製 local Nuxt admin、或 local CLI workflow。

### Sprint 4：LLM Draft Agent / Remote Draft Workflow

目標是讓使用者從 Discord 或其他 input adapter 丟商品 link 後，由 bridge / local orchestrator 將訊息送入 opencode headless session，產生商品 draft。

範圍可能包含：Discord bot / bridge、input adapter abstraction、opencode session mapping、URL action confirmation、抓商品頁、擷取價格與圖片、產生推薦文、依個人語氣生成描述、寫入 product JSON、建立 isolated worktree / branch、透過 `gh` 或 Git provider PR broker 建 PR。

LLM 不直接 merge，也不直接將商品設為公開。人工 review 是發布 gate。

### Sprint 5：Price Monitoring

目標是定期檢查已上架商品的價格與狀態，並在有變動時通知使用者或產生更新 PR。

範圍可能包含：定時 job、價格抓取、歷史紀錄、降價或缺貨偵測、通知、必要時產生 content update PR。

價格歷史的儲存方式不在 umbrella plan 中定案，後續需依資料量與查詢需求決定使用 JSONL、SQLite 或外部儲存。

## Survey 摘要

`@nuxt/content` 適合本專案作為 Git-backed Nuxt content layer，支援 JSON files、content collections、schema validation 與 SSG。

Pages CMS 與 Decap CMS 適合作為後續 Git-backed inside editing UI 候選。TinaCMS 與 Keystatic 也支援 Git-backed content，但與 Nuxt 的直接契合度較低。

`lowdb` 適合 local JSON tool，但不是 Git workflow CMS。`simple-git` 適合自製 local Node agent 時操作 branch、commit、push、PR 前置流程。`isomorphic-git` 可在 Node 與 browser 使用，但 local Node 情境下 `simple-git` 較直接。`git-documentdb` 概念接近，但套件更新較慢，不建議作為主幹。

Pi Agent、Codex App、T3 Code、opencode 與 agentic flow 的初步 survey、風險與驗證項目記錄在 `research.md`。目前已驗證 opencode headless session 可多輪續談並取回完整 transcript，因此 remote draft workflow 優先採 opencode control plane。GitHub PR 建立、`gh` / GitHub token 行為仍需 technical spike；更嚴格的 broker、schema validation 與 diff scope check 可留到後續安全加強。

## 待釐清事項

- GitHub Actions 的部署目標與 workflow artifact 細節需在 Sprint 1 spec 定義。
- 商品 JSON 的最終欄位、必填規則、URL validation 與時間欄位規則需在 Sprint 1 spec 定義。
- date prefix 要使用建立日期、預計發布日期或首次發布日期，需在 Sprint 1 spec 定義。
- PR 粒度要由 inside UI 與 agent 能力決定，umbrella plan 只要求 changeset-based workflow。
- 公開站 UI 設計稿需在 Sprint 2 spec 前於 claude.ai Artifacts 產出，再帶入 spec 作為驗收依據。
- Search 方案（Nuxt Content 內建搜尋、MiniSearch、外部搜尋引擎）需在 Sprint 2 plan 或 spec 決定。
- inside editing UI 要用 Pages CMS、Decap CMS、自製 admin 或 CLI workflow，需在 Sprint 3 plan 或 spec 決定。
- Discord channel 與商品分類如何命名、權限如何設計、是否使用 forum / text channel，需在 Sprint 4 plan 或 spec 決定；但 Discord 只視為 input adapter。
- Category research session 與 draft job session 的 mapping schema 需在 Sprint 4 plan 或 spec 決定。
- opencode 作為主要 control plane 的 session lifecycle、permission handling、event streaming 與 transcript retention 需在 Sprint 4 plan 或 spec 決定。
- 是否需要 `gh` / Git provider PR broker / action，以及其權限模型、token 儲存、command allowlist、hooks guardrail，需在 Sprint 4 plan 或 spec 決定。
- 價格歷史資料量與保存期限需在 Sprint 5 plan 或 spec 決定。

## 下一步

Sprint 1 spec 已建立（v1），聚焦 Nuxt SSG、Nuxt Content、商品 JSON schema、Sheet migration 與 GitHub Actions static rebuild。v3 改版將在 Sprint 1 實作完成後，以 Sprint 2 spec 為目標，先在 claude.ai Artifacts 做 UI 設計再帶回。
