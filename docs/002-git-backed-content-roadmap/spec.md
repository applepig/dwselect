# Sprint 1：Git-backed Content Data Layer

## 目標

將 DW嚴選公開站從 runtime Google Sheets TSV 改為 Git-backed JSON content，並遷移到 Nuxt SSG + Nuxt Content。商品資料以 `content/products/*.json` 作為 repo 內 SSOT，GitHub PR merge 後由 CI 產生靜態網站，前台只顯示 `status = "published"` 的商品。

## 非目標

- 不做 inside 後台 UI。
- 不做 Discord bot、agent draft workflow、T3 Code 整合或自動建 PR。
- 不做價格監控、通知、價格歷史資料庫。
- 不做 Wishlist、Dark Mode、進階篩選、商品詳情 modal 等 `001-revamp` UX 功能。
- 不讓公開站 runtime 直接讀 Google Sheets、GitHub API 或自管 SQLite。
- 不處理商品圖片下載與本地化；圖片仍使用來源 URL。

## User Story

作為 DW嚴選維護者，我想把商品資料放在 Git repo 內並透過 PR 審核，以便每次商品異動都有 diff、review、rollback 與 CI rebuild。

作為網站訪客，我想看到已上架商品的靜態頁面，以便網站載入穩定，不依賴 Google Sheets runtime fetch。

### 驗收條件

- [x] 專案改為 Nuxt SSG app，並可用 `pnpm generate` 產生靜態輸出。
- [x] 商品資料存在 `content/products/*.json`，每個商品一檔，且 Nuxt Content schema 會驗證必要欄位、狀態 enum、HTTP(S) URL 欄位與 timestamp 欄位格式。
- [ ] 前台商品查詢只回傳 `status = "published"` 的商品；`draft`、`unpublished`、`archived` 不會出現在公開首頁。
- [ ] Google Sheets TSV 只作為 migration input；公開站 client bundle 不再包含 Google Sheets TSV URL，也不會在 runtime fetch Google Sheets。
- [x] Migration script 能把 legacy TSV 欄位轉成新 product JSON schema，包含 `name`、`price_text`、`description`、`purchase_url`、`image_url`、`category`、`tags`、`reference_url`，並支援固定 cutover date 讓 rerun 產生穩定檔名與 `id`。
- [x] Migration script 會保留 legacy 行為：空白分類轉為 `未分類`，`tags` 從空白分隔字串轉為 array，並依 `purchase_url` host 加入 `PCHome`、`momo`、`美亞`、`日亞` 這類平台 tags。
- [x] Migration script 會跳過沒有 `name` 的 row，並對欄位數不符、URL 無效、非 HTTP(S) URL 或檔名 collision 產生可讀錯誤或 warning。
- [ ] Home page 至少顯示已上架商品卡片，依 category 分組，卡片包含圖片、名稱、價格與購買連結。
- [ ] GitHub Actions 會安裝 dependencies、執行測試、執行 Nuxt static generate，並保留 `.output/public` static artifact。

## 相關檔案

- `package.json` — 從 Vue/Vite scripts 轉為 Nuxt scripts，新增 test / generate 指令。
- `nuxt.config.ts` — Nuxt SSG 與 Nuxt Content 設定。
- `content.config.ts` — Nuxt Content collection 與 product schema。
- `content/products/*.json` — 商品資料 SSOT，每個商品一檔。
- `scripts/migrate-google-sheet-products.ts` — legacy TSV 到 product JSON 的 migration script。
- `app/pages/index.vue` 或 Nuxt 對應 page — 首頁商品列表，只查詢 published products。
- `app/components/*` — 商品列表與卡片元件，僅做 Sprint 1 最小 UI。
- `tests/product-schema.test.ts` — product schema 驗證測試。
- `tests/migrate-google-sheet-products.test.ts` — TSV migration 測試。
- `tests/published-products.test.ts` — published filter 測試。
- `.github/workflows/static-generate.yml` — GitHub Actions static generate workflow。
- `legacy/index.html` — migration 參考來源，不作為新 runtime code。
- `src/composables/useGoogleSheet.js` — 舊 placeholder，Sprint 1 後不應再被公開站使用。
- `src/stores/products.js` — 舊 placeholder，Sprint 1 後不應再被公開站使用。

## 介面 / 資料結構（API / Data Structure）

本 sprint 不新增 REST、SSE 或 WebSocket API。資料通訊協定是 build-time filesystem JSON，透過 Nuxt Content collection 讀取，Nuxt generate 後輸出靜態 HTML / payload。

Product JSON 範例：

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

Status enum：

```json
["draft", "published", "unpublished", "archived"]
```

Legacy TSV 欄位 mapping：

| TSV 欄位 | Product JSON 欄位 | 規則 |
| --- | --- | --- |
| `name` | `name` | trim 後必填 |
| `price` | `price_text` | 保留原文字，不在本 sprint parse numeric price |
| `desc` | `description` | 保留文字內容，換行由前台渲染處理 |
| `link_url` | `purchase_url` | 必須是有效 HTTP(S) URL |
| `img_url` | `image_url` | 必須是有效 HTTP(S) URL |
| `tags` | `tags` | 空白分隔轉 array，移除空字串 |
| `category` | `category` | 空值轉 `未分類` |
| `reference` | `reference_url` | 空值轉 `null`，非空必須是有效 HTTP(S) URL |

Build-time query input 範例：

```json
{
  "collection": "products",
  "where": {
    "status": "published"
  },
  "sort": [
    { "category": "ASC" },
    { "published_at": "DESC" },
    { "name": "ASC" }
  ]
}
```

Published product response shape 範例：

```json
[
  {
    "id": "2026-06-02-sample-product",
    "name": "商品名稱",
    "price_text": "NT$ 1,990",
    "purchase_url": "https://example.com/product",
    "image_url": "https://example.com/product.jpg",
    "category": "未分類",
    "tags": ["tag-a", "tag-b"]
  }
]
```

Filename / ID 規則：

檔名使用 `YYYY-MM-DD-<slug>.json`。新商品使用 draft 建立日期；legacy migration 使用一次性 cutover date。Migration script 必須支援 `--date YYYY-MM-DD`，讓同一份 TSV 用同一個 date rerun 時產生相同檔名與 `id`；未傳 `--date` 時可使用執行當日，但正式 cutover 應明確傳入固定 date。`id` 必須等於檔名不含 `.json`。若商品名稱無法產生可讀 slug，使用 `product-<short-hash>`；若 collision，追加 `-2`、`-3`。

Timestamp / edit history 規則：

Sprint 1 只驗證 timestamp 欄位格式，不建立完整狀態 transition invariant。`created_at` 與 `updated_at` 必填；`published_at`、`unpublished_at`、`archived_at` 可為 timestamp 或 `null`。Git commit history 與 PR review 是第一層編輯紀錄；若後續 inside UI 需要在商品資料內顯示狀態歷史，再另行設計 `status_history` 或 edit log。

## 邊界案例

- Case 1：TSV row 欄位數不等於 header 數量。處理方式：跳過該 row，記錄 warning，migration script 最後輸出 skipped count。
- Case 2：商品沒有 `name`。處理方式：跳過該 row，因為無法產生穩定列表與可讀 PR diff。
- Case 3：`purchase_url` 或 `image_url` 不是有效 HTTP(S) URL。處理方式：migration script 將該 row 標記為 error，不寫入 JSON；人工修正 TSV 或 migration input 後重跑。`javascript:`、`data:` 與相對路徑都不允許。
- Case 4：`reference` 空白。處理方式：`reference_url` 寫入 `null`。
- Case 5：兩個商品產生相同 slug。處理方式：第一個保留原 slug，後續追加數字 suffix，並在 migration summary 中列出 collision。
- Case 6：商品 `status` 不是允許 enum。處理方式：schema validation 失敗，測試與 CI 不通過。
- Case 7：商品是 `draft` 但有 `published_at`。處理方式：schema validation 允許 timestamp 保留歷史，但前台仍只看 `status`，因此不顯示；狀態歷史的完整 audit 先依賴 Git history / PR review。

## ADR（Architecture Decision Record）

- 決策：Sprint 1 從 Vue 3 + Vite 遷移到 Nuxt SSG + Nuxt Content。
- 原因：umbrella plan 已選定 Git-backed JSON content；Nuxt Content 提供 content collection、schema validation 與 SSG 查詢，最接近 GitBook 式 workflow。
- 替代方案：保留 Vue/Vite 並自行讀 JSON。排除原因：需要自己補 content discovery、schema validation、static payload pipeline，後續和 Nuxt Content roadmap 會分叉。

- 決策：每個商品一個 JSON 檔，而不是單一 `products.json`。
- 原因：PR diff 可讀性較好，單商品修改不會造成大檔案衝突，agent draft 與人工 review 都更容易切分。
- 替代方案：單一 JSON array。排除原因：批次排序與格式化會讓 diff 噪音變大。

- 決策：legacy TSV migration 的初始商品狀態預設為 `published`。
- 原因：現有 Google Sheet 代表目前公開商品來源；遷移後應維持公開站可見內容，不因資料來源切換而全部下架。
- 替代方案：全部匯入為 `draft`。排除原因：會讓公開站初次 cutover 變成空站，需額外人工逐筆上架。

- 決策：GitHub Actions 先負責 test + static generate + artifact，不在 Sprint 1 綁定正式網域或 Pages 設定細節。
- 原因：canonical provider 改為 GitHub；第一步先保證每個 PR / merge 都能重建靜態輸出，artifact 使用 Nuxt generate 的 `.output/public`。
- 替代方案：直接定義完整 production deploy。排除原因：部署目標與網域尚未在 repo 中出現，過早定案會增加不必要風險。

## Milestones

### Milestone 1：Nuxt SSG 基礎與測試腳本

> 預期結果：專案可用 Nuxt 啟動、測試、產生靜態輸出，且不再依賴 Vite-only app entry。
> 驗證方式：`pnpm test`、`pnpm generate`

- [x] 撰寫/更新測試（Red）：新增最小 smoke test，先描述 Nuxt app 與 product query helper 預期存在。
- [x] 實作最小功能（Green）：加入 Nuxt、Nuxt Content、Vitest 相關 scripts 與設定，保留現有樣式可後續搬移。
- [x] Refactor 並確認測試維持通過：移除或隔離不再使用的 Vue/Vite placeholder runtime path。

### Milestone 2：Product schema 與 legacy TSV migration

> 預期結果：`content/products/*.json` 有正式 schema，migration script 可從 legacy TSV 產生符合 schema 的 JSON。
> 驗證方式：`pnpm test tests/product-schema.test.ts tests/migrate-google-sheet-products.test.ts`

- [x] 撰寫/更新測試（Red）：覆蓋 status enum、HTTP(S) URL validation、固定 cutover date、空白 category、tags 轉換、平台 tags、缺 name、欄位數不符與 slug collision。
- [x] 實作最小功能（Green）：建立 product collection schema、migration parser、slug/id 產生規則與 sample fixture。
- [x] Refactor 並確認測試維持通過：整理 migration summary output，讓 skipped / errored rows 可讀。

### Milestone 3：Published-only 首頁商品列表

> 預期結果：首頁從 Nuxt Content 讀取商品，只顯示 `published`，依 category 分組並渲染最小商品卡片。
> 驗證方式：`pnpm test tests/published-products.test.ts`、`pnpm generate`

- [ ] 撰寫/更新測試（Red）：建立 fixture products，驗證 `draft`、`unpublished`、`archived` 不會出現在 published query。
- [ ] 實作最小功能（Green）：首頁查詢 published products，渲染 category sections、image、name、price、purchase link。
- [ ] Refactor 並確認測試維持通過：抽出最小 data mapping，避免 UI 直接依賴 legacy TSV 欄位名。

### Milestone 4：GitHub Actions static rebuild 與 runtime Sheet 移除驗收

> 預期結果：GitHub Actions 可在 PR / main workflow 跑測試與 static generate，公開站 runtime 不再包含 Google Sheets TSV URL。
> 驗證方式：`pnpm test`、`pnpm generate`、GitHub Actions workflow、搜尋 build output 不含 Google Sheets TSV URL

- [ ] 撰寫/更新測試（Red）：新增檢查或 CI step，確認公開 runtime code 不包含 legacy Google Sheets TSV URL。
- [ ] 實作最小功能（Green）：新增 `.github/workflows/static-generate.yml`，執行 install、test、generate，保存 `.output/public` static artifact。
- [ ] Refactor 並確認測試維持通過：更新 README 的 local development / migration / generate 指令。
