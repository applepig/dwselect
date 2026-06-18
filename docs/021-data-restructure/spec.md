# Data Restructure

## Status

- 狀態：完成，已驗收
- Branch：`docs/data-restructure`
- 文件包：`docs/021-data-restructure/`

## Goal

重整本站資料層，讓 Git-backed content、taxonomy、validation、build-time payload 與 runtime 使用方式有更清楚的責任邊界，降低後續新增內容與維護資料品質的成本。

## Problem

目前資料層已逐步從 legacy Google Sheets 遷移到 Git-backed JSON，但「資料重整」的具體範圍尚未收斂。需要先確認本 sprint 要處理的是資料模型、資料品質、資料產製流程，或 content 本身的批次整理，避免一次改動過大。

## Non-Goals

- 不引入 CMS、Google Sheets、資料庫或 runtime API。
- 不改變公開 runtime 的靜態內容來源原則。
- 不在 spec 確認前修改 production code。
- 不在本 sprint 預設進行大量內容重寫，除非後續明確納入 scope。

## User Stories

1. 作為 content maintainer，我想要清楚知道每種資料欄位的責任與用途，讓新增或修正內容時不需要猜測欄位語意。
2. 作為 developer，我想要資料驗證能指出 taxonomy、必填欄位、公開 payload 與 search index 的問題，讓錯誤在 CI 前或 CI 中被攔下。
3. 作為網站使用者，我想看到穩定且一致的商品、指南與連結資料，避免缺漏或分類錯誤造成瀏覽與搜尋體驗下降。

## Acceptance Criteria

scope 已確認（見 Decisions 三條 ADR），驗收條件與對應測試如下：

- 資料重整 scope 明確寫入本 spec，且每個 acceptance criterion 都能對應測試或驗證命令。
- 若調整 schema，需同步更新 schema validation 測試。
- 若調整 build-time payload，需同步更新 public discovery、search index 或 route generation 相關測試。
- 若調整 content JSON，需可用既有或新增驗證確認資料一致性。
- 完成後需跑對應測試；若涉及 UI、navigation、routing、layout 或 generate，需實際確認頁面可載入。

## Open Questions

1. 本 sprint 的核心目標要選「資料模型」、「資料品質」、「資料產製流程」還是「content 批次整理」？
2. 是否允許修改既有 content JSON？若允許，範圍是少量修正還是批次重整？
3. 是否需要新增資料品質報告 CLI，或只強化既有 Vitest schema tests？
4. 是否要把 guides／links 的資料模型一起納入，或先聚焦 products？

## Decisions（ADR）

### 決策（2026-06-18）：公開排序鍵由 `published_at` 改為 `updated_at`

- **背景**：020 sprint 的 ADR（2026-06-16）將 product／guide 的 canonical comparator 統一為 product `category→published_at→name`、guide `published_at→name`，語意是「最新上架優先」。
- **決策**：本 sprint 把 product／guide 的時間排序鍵改為 `updated_at`（product `category→updated_at→name`、guide `updated_at→name`，tie-break 仍為 `compareText`），語意改為「最近維護優先」。此決策**修訂並取代** 020 ADR（2026-06-16）的時間鍵選擇。
- **後果（user-visible，刻意變更）**：catalog 列表、搜尋 idle／baseline 順序、guide 列表的時間排序改吃編輯近因。content 維護（補 `llm_description`、修價格／圖片）若更新 `updated_at`，會把該品項往前排。`updated_at` 的維護由 coordinator 控制（content researcher subagent 預設不動 `updated_at`，見 `dwselect-content-authoring`）。
- **影響範圍**：`compare-products.ts`、`compare-guides.ts`、`search-index.ts`、`scripts/public-payload/map-resource-rows.ts`、`scripts/public-payload/map-related-product-card.ts`（相關商品排序一併對齊 `updated_at`，避免同 domain concept 出現兩套規則）。

### 決策（2026-06-18）：Links 維持人工 `sort_order` 優先

- **決策**：新增的 `compare-links.ts` 以 `sort_order` 升序為**第一**排序鍵，之後依 `updated_at desc → compareText(title) → id` 作 stable tie-break。
- **理由**：Links 是少量人工精選入口，`sort_order` 是 maintainer 明確編排的展示策略，不應被任一 link 的編輯近因（`updated_at`）蓋過。

### 決策（2026-06-18）：Product `id` 為穩定 URL key，與 `english_name` 解耦

- **背景**：commit `7fa9a2a` 將 `2026-06-02-aibo-qi-power-bank` 的 `english_name` enrich 為完整型號 `aibo PD/QC3.0 Qi Wireless Fast Charging 10000mAh Power Bank`，但 `id`（公開 route `/products/<id>`）維持精簡形式，與舊測試規則 `id === created_at-slugify(english_name)` 衝突。
- **決策**：`id` 是穩定的公開 URL key，一經上線不隨內容 enrich 變動；`english_name` 是可獨立演進的描述欄位。schema 一致性測試放寬為「`id` 以 `YYYY-MM-DD-` 開頭且為合法 kebab-case slug」，不再強制等於完整 `english_name` slug。
- **理由**：URL 穩定性優先於欄位 slug 對齊；強制兩者相等會讓任何 content enrich 都被迫改動公開 URL，違反靜態站的連結穩定原則。
- **影響範圍**：`tests/product-schema.test.ts` 的 id 一致性斷言。content 新增時仍建議由 `english_name` slug 產生 id 作為慣例，但非強制 invariant。

## Milestones

### Milestone 1：Scope Confirmation ✅

確認資料重整的範圍、非目標與驗收條件，完成可執行的 spec。scope 收斂為公開排序鍵語意（`updated_at`）、Links 排序（`compare-links`）與 `id` 穩定性三條 ADR。

### Milestone 2：Validation And Tests ✅

新增 `tests/content/compare-links.test.ts`（sort_order 優先 + updated_at／title／id tie-break 共 5 case），並對齊排序鍵變更影響的既有測試。

### Milestone 3：Implementation ✅

排序鍵 `published_at`→`updated_at`（`compare-products.ts`、`compare-guides.ts`、`map-related-product-card.ts`）；新增 `app/utils/content/compare-links.ts`，`search-index.ts`／`map-resource-rows.ts` 改用 `compareLinks`。

### Milestone 4：Verification And Documentation ✅

跑完整驗證（`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm generate`、runtime clean、E2E 與 agent-browser），修正排序鍵後果與 stale 測試，依「`id` 穩定」決策放寬 schema 一致性測試，更新 `works.md`。
