# Sprint 3：Legacy Data Cutover Validation

## 目標

將 legacy Google Sheets TSV 的現有商品資料以一次性 input 轉成 Git-backed product JSON，不在 repo 內保留 TSV；以 66 筆 `content/products/*.json` 作為固定 cutover snapshot，並用真實商品驗證 Nuxt Content、公開 catalog、MiniSearch static index、static generate 與 runtime Google Sheets clean scan 都能正確運作。

## 非目標

- 不做 inside editing UI、CMS 或 local admin。
- 不做 Discord bridge、LLM draft agent、PR broker 或 remote draft workflow。
- 不新增 REST、SSE、WebSocket API。
- 不做價格數字解析、價格排序、價格歷史或價格監控。
- 不下載或本地化商品圖片；圖片仍使用 legacy source URL。
- 不讓公開站 runtime fetch Google Sheets TSV。
- 不把 `brand`、`price_value` 納入 Product schema；本 sprint 僅保留既有公開站需要的欄位。

## User Story

作為 DW嚴選維護者，我想把現有 Google Sheets 商品資料固定遷移到 Git-backed JSON content，以便後續 inside editing 與 agent workflow 都建立在已驗證的真實資料集上。

作為網站訪客，我想在新公開站看到完整既有商品資料，並能用分類、搜尋與排序瀏覽，而不是只看到 sample product。

### 驗收條件

- [x] `content/products/` 包含 66 筆真實 product JSON，作為固定 cutover snapshot；`2026-06-02-sample-product.json` 不再作為公開商品存在。
- [x] Repo 不保留 `legacy/products.tsv`；legacy TSV 只作一次性 migration input，後續 SSOT 是 product JSON。
- [x] Migration summary 記錄 Created 66、Skipped 0、0 errors/warnings，以及 3 筆 slug collision（`ikea`、`iris`、`panasonic` numeric suffix）。
- [x] Migration 使用固定 cutover date，產生穩定 filename / id；slug collision 以 numeric suffix 解決並在 summary 或測試中可觀察。
- [x] 所有產生的 product JSON 都通過 `product_schema`，且 `id` 等於檔名 stem。
- [x] `public/search-index.json` 由真實 product JSON 重新產生，document count 與 published product count 一致。
- [x] 首頁公開 catalog 顯示真實商品分類與商品卡，不顯示 sample product。
- [x] 搜尋可命中真實商品的 `name`、`category` 與 `tags`，並且 autocomplete limit 不影響主列表完整結果。
- [x] `pnpm test` 通過。
- [x] `pnpm generate` 通過。
- [x] `node scripts/assert-runtime-google-sheet-clean.ts` 通過，公開 runtime 與 static output 不含 Google Sheets TSV reference。

## 相關檔案

- `legacy/index.html` — legacy Google Sheets TSV URL 的歷史來源，只作參考，不進公開 runtime。
- `scripts/migrate-google-sheet-products.ts` — 既有 TSV 到 product JSON migration script。
- `content/products/*.json` — migration 後的 Git-backed product JSON SSOT。
- `public/search-index.json` — 由真實 product JSON 產生的 client lazy-load search index。
- `app/utils/product-schema.ts` — product JSON schema validation。
- `app/utils/published-products.ts` — catalog mapping、分類、排序與 search result 對應。
- `app/utils/search/*` — MiniSearch index build/load/query 與 tokenizer。
- `app/pages/index.vue` — 公開 catalog UI，需用真實資料通過 generate 與 smoke 驗收。
- `tests/migrate-google-sheet-products.test.ts` — migration behavior、inline TSV fixture、summary 與 edge cases 測試。
- `tests/product-schema.test.ts` — product schema 測試。
- `tests/search-index.test.ts` — search index contract 測試。
- `tests/nuxt-smoke.test.ts` — static output / catalog smoke 測試。
- `scripts/assert-runtime-google-sheet-clean.ts` — runtime Google Sheets reference 掃描。

## 介面 / 資料結構（API / Data Structure）

本 sprint 不新增 REST、SSE 或 WebSocket API。資料通訊協定是 repo 內檔案：`content/products/*.json` 作為 cutover snapshot 與 Nuxt Content source，`public/search-index.json` 作為 client lazy-load static JSON。Legacy TSV 只作一次性 migration input，不作 repo 內資料契約。

Migration output 使用既有 Product JSON schema；`brand` 與 `price_value` 不寫入 Product JSON，也不透過 TSV snapshot 保存在 repo。

Product JSON 範例：

```json
{
  "id": "2026-06-02-sharp-65-xled",
  "status": "published",
  "name": "Sharp 65吋 XLED",
  "price_text": "43000",
  "description": "如果不想買OLED的話，現在Sharp XLED應該是最好的選擇",
  "purchase_url": "https://24h.pchome.com.tw/prod/DPADN9-A900HQHS6",
  "image_url": "https://img.pchome.com.tw/cs/items/DPADN9A900HQHS6/000001_1724033495.jpg",
  "category": "影音",
  "tags": ["電視", "影音", "PCHome"],
  "reference_url": null,
  "created_at": "2026-06-02T00:00:00+08:00",
  "updated_at": "2026-06-02T00:00:00+08:00",
  "published_at": "2026-06-02T00:00:00+08:00",
  "unpublished_at": null,
  "archived_at": null
}
```

## 邊界案例

- Case 1：Live Google Sheets 內容後續變動。處理方式：本 sprint 完成 cutover 後以 66 筆 `content/products/*.json` 作為固定 snapshot；build 與 review 不再依賴 live TSV。
- Case 2：Slug collision。處理方式：沿用 migration script numeric suffix，例如 `2026-06-02-ikea`、`2026-06-02-ikea-2`，並以測試或 migration summary 覆蓋。
- Case 3：商品圖片 URL 失效、hotlink 擋圖或尺寸不一致。處理方式：本 sprint 不下載圖片；驗收只要求頁面 layout 不重疊、不崩潰，圖片品質問題列入後續圖片本地化或資料修正。
- Case 4：Legacy row 有 `brand` 或 `price_value` 但新 schema 不保留。處理方式：本 sprint 明確忽略；若 inside editing 或 price monitoring 需要，另開 schema evolution。
- Case 5：Legacy TSV 最後一欄 `reference` 可能是 trailing empty column。處理方式：script 支援省略最後空欄；不保留 TSV snapshot，避免 trailing empty columns 造成 snapshot 噪音。
- Case 6：公開 runtime 重新包含 Google Sheets TSV URL。處理方式：`assert-runtime-google-sheet-clean` 必須在 generate 後通過；`legacy/` 與 `docs/` 內保留 reference 仍允許。

## ADR（Architecture Decision Record）

- 決策：在 Inside Editing Workflow 前插入 Legacy Data Cutover Validation sprint。
- 原因：目前 Sprint 2 只用 sample product 驗證 UI/search，尚未證明真實 66 筆商品資料可通過 catalog/search/generate。先做 cutover 可降低後續 inside editing 建在錯誤資料假設上的風險。
- 替代方案：直接進 Sprint 3 inside editing。排除原因：資料量、圖片、分類、tag、slug collision 與 search index 真實行為尚未驗證。

- 決策：採 snapshot 全量切換，而不是 dry-run 報告或小批量試切。
- 原因：只讀 dry-run 已確認 66 筆可建立、0 skipped，search index 可產生 66 documents；剩餘主要風險是真實資料進站後的整體行為，全量切換最能驗證。
- 替代方案：先做 dry-run report。排除原因：無法驗證 Nuxt Content、MiniSearch 與 UI。
- 替代方案：小批量試切。排除原因：容易漏掉 collision、分類分布、長文字與圖片 URL 問題。

- 決策：不保留 `legacy/products.tsv`。
- 原因：TSV 只作一次性 migration input，後續 SSOT 是 product JSON；保留 TSV 會讓 trailing empty columns（例如空 `reference` 欄）在 diff / snapshot 中製造噪音，且使用者已確認 TSV 後續不會使用。
- 替代方案：保留 TSV snapshot 作來源追溯。排除原因：後續工作流不使用 TSV，且 `content/products/*.json`、migration summary、schema/search/static 驗證已足以作 cutover snapshot 與驗收依據。

- 決策：不把 `brand` 與 `price_value` 寫入 Product JSON。
- 原因：現有公開站與 Product schema 不需要這兩欄；不擴 schema 可維持本 sprint 聚焦 cutover validation。
- 替代方案：立即擴 schema。排除原因：會引入 UI 呈現、inside editing 與價格監控語意，超出本 sprint。

## Milestones

### Milestone 1：Cutover data contract 與 migration summary

> 預期結果：66 筆 `content/products/*.json` 作為固定 cutover snapshot，migration summary 記錄 Created 66、Skipped 0 與 collision；repo 不保留 TSV snapshot。
> 驗證方式：`pnpm test tests/migrate-google-sheet-products.test.ts tests/product-schema.test.ts`

- [x] 撰寫/更新測試（Red）：覆蓋 inline fixture migration summary、0 skipped、slug collision、id 等於 filename stem，以及 66 筆 content JSON 驗收。
- [x] 實作最小功能（Green）：以固定 cutover date 產生 66 筆 product JSON，移除 sample product，不保留 `legacy/products.tsv`。
- [x] Refactor 並確認測試維持通過：保持 migration script header-name based，不新增 runtime Google Sheets dependency。

### Milestone 2：Content cutover 與 search index regeneration

> 預期結果：`content/products/` 由 66 筆真實商品 JSON 組成，sample product 移除，search index documents count 為 66。
> 驗證方式：`pnpm build:search-index`、`pnpm test tests/search-index.test.ts tests/published-products.test.ts`

- [x] 撰寫/更新測試（Red）：覆蓋真實 content count、sample product 不存在、search index document count 與 content count 一致。
- [x] 實作最小功能（Green）：以固定 cutover date 執行 migration，更新 `content/products/*.json` 與 `public/search-index.json`。
- [x] Refactor 並確認測試維持通過：確認 canonical id、category、tags 與 search document mapping 沒有 drift。

### Milestone 3：Static catalog 驗收

> 預期結果：真實 66 筆商品可在首頁 catalog 與搜尋中使用，static output 不含 Google Sheets runtime reference。
> 驗證方式：`pnpm test`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`

- [x] 撰寫/更新測試（Red）：補 Nuxt smoke 或 static output 驗收，確認真實商品名稱、分類、搜尋 index artifact 與 sample product 移除。
- [x] 實作最小功能（Green）：必要時修正 UI / search / generate 在真實資料下暴露的小問題。
- [x] Refactor 並確認測試維持通過：更新 README 或 works.md，記錄 cutover command、summary 與驗收結果。
