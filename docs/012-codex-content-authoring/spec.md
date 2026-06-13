# Codex Content Authoring — AGENTS.md

## 目標

建立 `content/AGENTS.md`，作為 OpenAI Codex web agent 的 scoped instruction，讓 agent 能正確執行內容 authoring（Products、Guides、Links）與 taxonomy 維護，並以 PR 交付成果。

## 非目標

- 不修改現有 schema、content model 或驗證邏輯
- 不建立自動化 CI pipeline（Codex agent 在 sandbox 內手動跑 `pnpm test`）
- 不處理 Discord agent 整合（009 sprint scope）
- 不改變現有的 Git 分支策略或 deploy 流程

## User Story

作為 DW嚴選的內容管理者，我想要一份清楚的 agent 指令文件，以便 Codex web agent 能根據我的指示正確地新增、更新、封存商品 / 指南 / 連結，並在每次任務結束後發出品質合格的 PR。

### 驗收條件

- [x] `content/AGENTS.md` 涵蓋三種內容類型（products、guides、links）與 taxonomy 維護的完整操作指引
- [x] 文件包含完整的 JSON schema 欄位說明與範例，agent 不需要另讀 source code 就能正確填寫
- [x] 文件定義兩類主要工作流程：新增內容（含模糊需求研究流程）、更新/封存內容
- [x] 文件明確說明 taxonomy 新增策略：agent 先提議，使用者確認後才寫入
- [x] 文件說明圖片下載流程：實體檔下載到 `content/products/images/` 或 `content/guides/images/`，JSON 使用公開路徑 `/images/products/` 或 `/images/guides/`
- [x] 文件說明驗證步驟：`pnpm install && pnpm test`
- [x] 文件說明 PR 工作流程：branch 命名、commit 格式、PR 標題與說明
- [x] 文件說明撰寫分工：`summary` / `long_description` 由使用者提供，agent 負責結構化欄位與研究資料
- [x] 新內容預設 `status: "published"`，timestamps 正確設定
- [x] `pnpm test` 通過（AGENTS.md 不影響既有測試）

## 相關檔案

- `content/AGENTS.md` — 本次新增的目標檔案
- `app/utils/product-schema.ts` — Zod schema 定義（product、guide、link、taxonomy）
- `content.config.ts` — Nuxt Content collection 定義
- `content/taxonomies/` — categories.json、brands.json、tags.json、channels.json
- `content/products/*.json` — 現有產品範例
- `content/guides/*.json` — 現有指南範例
- `content/links/*.json` — 現有連結範例

## 資料結構

### AGENTS.md 內容架構

AGENTS.md 是純 Markdown 指令文件，分為以下段落：

1. **專案概述** — DW嚴選的定位、content model 概要
2. **角色與分工** — Agent 是研究員 + 結構化資料填充者；`summary` / `long_description` 由使用者提供
3. **Content Schema Reference** — 三種內容類型的完整欄位說明與範例 JSON
4. **Taxonomy Reference** — categories、tags、brands、channels 的結構與現有值列表
5. **工作流程：新增內容** — 含模糊需求研究流程（搜尋 → 提議 2-3 選項 → 使用者選擇）
6. **工作流程：更新 / 封存內容**
7. **Taxonomy 維護** — 新增 brand/tag 的提議 → 確認流程
8. **圖片處理** — 下載到 local path 的流程與命名規則
9. **驗證** — `pnpm install && pnpm test`
10. **PR 工作流程** — branch 命名、commit、PR 格式
11. **約束與禁止事項**

### 內容欄位分工

| 欄位 | 填寫者 | 說明 |
|------|--------|------|
| `id` | Agent | `YYYY-MM-DD-{brand}-{product-slug}` 格式，與檔名一致 |
| `status` | Agent | 預設 `"published"` |
| `name` | Agent | 中文產品名稱，從賣場頁面擷取 |
| `english_name` | Agent | 英文品牌 + 型號名 |
| `summary` | 使用者 | 使用者的個人觀點與推薦理由 |
| `long_description` | 使用者 | 使用者的詳細說明 |
| `llm_description` | Agent | Agent 撰寫的客觀產品描述，用於搜尋與 LLM 理解 |
| `search_aliases` | Agent | 從研究中收集的替代搜尋詞 |
| `model_numbers` | Agent | 從產品頁面擷取的型號 |
| `offers` | Agent | 賣場連結、價格、通路，agent 研究填入 |
| `image_url` | Agent | 下載圖片後的 local path |
| `category_id` | Agent | 從現有 categories 中選擇最適合的 |
| `tag_ids` | Agent | 從現有 tags + brands 中選擇，需要新增時先提議 |
| `reference_url` | Agent | Agent 研究找到的產品官網、評測文章等 |
| `*_at` timestamps | Agent | 自動設定 |

## 邊界案例

1. **使用者提供的 URL 無法存取**：Agent 應回報無法存取，請使用者確認 URL 是否正確或提供替代來源
2. **賣場不在已知 channels 中**：使用 `channel_id: "other"`，不自動新增 channel
3. **使用者未提供 summary / long_description**：Agent 在 PR 中標記這些欄位需要使用者補充，暫時填入空字串
4. **圖片下載失敗**：先用遠端 URL 作為 fallback（schema 允許），在 PR 中註明
5. **Taxonomy 提議被使用者拒絕**：使用現有最接近的 tag/brand，或省略該 tag
6. **一次任務涉及多個商品**：全部放在同一個 PR，branch 名稱用任務描述而非單一商品名

## ADR

### ADR-1：AGENTS.md 放在 `content/` 而非 repo root

- **決策**：將 AGENTS.md 放在 `content/AGENTS.md`
- **原因**：Codex 的 AGENTS.md scoping 機制——放在 `content/` 目錄下時，agent 在該目錄工作時會自動載入這份指令。內容 authoring 的操作範圍主要在 `content/` 目錄
- **風險**：agent 修改 `content/` 以外的檔案（如 taxonomy 在 `content/taxonomies/`，圖片在 `public/images/`）時，指令仍然適用。Codex 的 scoping 是「在此目錄下工作時載入」，不限制 agent 只能改這個目錄的檔案
- **替代方案**：放在 repo root 的 `AGENTS.md`——但 root 已有 `CLAUDE.md`，且 Codex 和 Claude Code 的指令語境不同，分開維護較清楚

### ADR-2：Taxonomy 現有值嵌入 AGENTS.md vs. 指向檔案

- **決策**：AGENTS.md 中嵌入 categories 和 channels 的完整列表（數量少且穩定），tags 和 brands 只列舉常用項目並指向來源檔案
- **原因**：Categories（7 項）和 Channels（6 項）數量少且幾乎不變，嵌入可讓 agent 不需額外讀檔就能做分類決策。Tags（30+）和 Brands（50+）數量較多且會持續增長，嵌入會讓 AGENTS.md 過長且容易過時
- **替代方案**：全部指向來源檔案——增加 agent 讀檔次數但永遠最新；全部嵌入——AGENTS.md 過長且 tags/brands 頻繁過時

## Milestones

### Milestone 1: 撰寫 content/AGENTS.md

> 範圍：新增 `content/AGENTS.md`，內容涵蓋專案概述、角色分工、schema reference、工作流程、驗證、PR 流程
> 驗證：`pnpm test` 通過（AGENTS.md 不干擾現有測試）；人工審閱文件內容正確性
> 預期結果：Codex web agent 讀取 AGENTS.md 後，能根據使用者指示正確建立商品 JSON、更新 taxonomy、下載圖片、發 PR

- [x] 撰寫 AGENTS.md 全文，包含：
  - 專案概述與 agent 角色定義
  - Product / Guide / Link 三種 schema 的完整欄位說明與範例 JSON
  - Categories / Channels 完整列表嵌入；Tags / Brands 列舉常用並指向來源檔案
  - 新增內容工作流程（含模糊需求研究 → 提議 2-3 選項流程）
  - 更新 / 封存內容工作流程
  - Taxonomy 維護流程（提議 → 確認 → 寫入）
  - 圖片下載與命名規則
  - 驗證步驟（`pnpm install && pnpm test`）
  - PR 工作流程（branch 命名 `content/{add|update|archive}-{slug}`、Conventional Commits、PR 標題與說明格式）
  - 約束與禁止事項
- [x] 確認 `pnpm test` 通過
