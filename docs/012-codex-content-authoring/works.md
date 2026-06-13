# 012 — Codex Content Authoring 工作紀錄

## Milestone 1: 撰寫 content/AGENTS.md

**狀態**：完成

### 完成項目

- 撰寫 `content/AGENTS.md`（約 300 行），涵蓋：
  - 專案概述與 agent 角色定義（研究員 + 結構化資料填充者）
  - Product / Guide / Link 三種 schema 完整欄位說明與範例 JSON
  - Categories（7 項）/ Channels（6 項）完整列表嵌入
  - Tags / Brands 列舉常用項目並指向 `content/taxonomies/` 來源檔案
  - 新增內容工作流程（含模糊需求研究 → 提議 2-3 選項流程）
  - 更新 / 封存內容工作流程
  - Taxonomy 維護流程（提議 → 確認 → 寫入）
  - 圖片下載到 `content/{type}/images/` 的流程與命名規則
  - 驗證步驟（`pnpm install && pnpm test`）
  - PR 工作流程（branch `content/{add|update|archive}-{slug}`、Conventional Commits、PR 說明格式）
  - 約束與禁止事項

### 技術決策

- **ADR-1**：AGENTS.md 放在 `content/` 而非 repo root，利用 Codex scoping 機制，與 root `CLAUDE.md` 分離
- **ADR-2**：Categories/Channels 數量少且穩定，直接嵌入 AGENTS.md；Tags/Brands 數量多且持續增長，只列常用項目並指向來源檔案
- 圖片路徑對應：實體檔案在 `content/products/images/`，Nitro publicAssets 映射到 `/images/products/`，AGENTS.md 中已說明兩者關係
- Product 的 `tag_ids` 混合使用 tag ID 和 brand ID，已在文件中特別標示
- Product 用單數 `category_id`、Guide/Link 用複數 `category_ids` 的差異已在多處強調
- 2026-06-14 文件審查後補強 taxonomy 新增流程：Tag / Brand 都需包含 `id`、`label`、`description`、`aliases`、`nav_visible`、`sort_order`
- 2026-06-14 文件審查後補強 Link 圖片限制：目前沒有 `/images/links/` 或 `content/links/images/`，Link local image path 只能使用現有 schema/runtime 支援路徑，否則省略或使用遠端 URL
- 2026-06-14 同步 `spec.md` 驗收條件完成狀態，並釐清圖片實體檔與公開 URL path 的差異

### 驗證

- `pnpm test`：25 files, 188 tests passed
