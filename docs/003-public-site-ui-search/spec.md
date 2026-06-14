# Sprint 2：Public Site UI + Search

## 目標

將 Sprint 1 的最小商品首頁提升為正式可用的公開站瀏覽體驗，加入分類瀏覽、關鍵字搜尋、搜尋建議、基本排序與響應式商品卡片。搜尋資料來源仍為 build-time Git-backed product JSON，公開站不新增 runtime API 或外部搜尋服務。

## 非目標

- 不做 Wishlist / favorite。
- 不做 Dark Mode。
- 不做商品詳情頁或 modal。
- 不做 View Transition 或頁面 morph 動畫。
- 不做價格數字解析、價格區間篩選或價格排序。
- 不做 inside editing UI、CMS、Discord bridge、opencode draft workflow 或 PR broker。
- 不更動 Product JSON schema 的核心欄位。
- 不新增 REST、SSE、WebSocket API。
- 不設定 production deploy、正式網域或 Pages。

## User Story

作為網站訪客，我想用分類、搜尋與排序快速找到商品，以便在商品數增加後仍能有效瀏覽 DW嚴選內容。

作為 DW嚴選維護者，我想讓搜尋 index 由 Git-backed content 在 build/generate 階段產生，以便公開站維持靜態部署模型，不引入外部搜尋服務或 runtime content API。

### 驗收條件

- [x] 首頁具有正式 public catalog layout，包含 header、搜尋列、分類瀏覽、排序控制、商品列表與空狀態。
- [x] 商品卡片顯示圖片、名稱、價格、分類、tags 與購買連結，並在手機、平板、桌面寬度下不發生文字或控制項重疊。
- [x] 首頁仍只顯示 `status = "published"` 的商品；`draft`、`unpublished`、`archived` 不會出現在列表、分類統計或搜尋結果。
- [x] 分類瀏覽可切換「全部」與各 category；切換分類會同步影響列表與搜尋結果。
- [x] 搜尋支援 `name`、`description`、`category`、`tags` 欄位，並可處理繁中詞彙與英數關鍵字。
- [x] 搜尋列使用 Nuxt UI `UInputMenu` 呈現下拉建議；實際搜尋由 MiniSearch 結果餵入，`UInputMenu` 不自行做內建 filter，autocomplete 僅顯示前 12 筆建議。
- [x] 主商品列表使用完整 MiniSearch 結果 id 集合篩選，不受 autocomplete 12 筆顯示上限截斷；分類篩選仍可顯示落在第 13 筆之後的搜尋命中。
- [x] 搜尋 index 由 build/generate 階段產生為 static JSON，client 端 lazy load，不放進首頁初始 JS bundle；載入失敗後不永久快取 rejected promise，下一次搜尋可重新 fetch。
- [x] 搜尋 tokenizer 以 `Intl.Segmenter('zh-Hant', { granularity: 'word' })` 為主，環境不支援時使用 bigram fallback。
- [x] 排序支援預設排序（分類排序：category → published_at → name）、最新上架、名稱排序；排序規則由 pure helper 覆蓋測試。
- [x] 搜尋空結果與無商品狀態有清楚 UI，不顯示錯誤或空白頁。
- [x] `pnpm test`、`pnpm generate` 與 `node scripts/assert-runtime-google-sheet-clean.ts` 通過。

## 相關檔案

- `package.json` — 新增 Nuxt UI、MiniSearch 與必要 scripts。
- `nuxt.config.ts` — 啟用 Nuxt UI module，維持 static preset。
- `app/pages/index.vue` — 公開首頁 catalog UI、搜尋列、分類與排序控制。
- `app/utils/published-products.ts` — 延伸 published-only mapping、filter、sort、category summary helper。
- `app/utils/format-published-date.ts` — 固定 Asia/Taipei 的公開站日期顯示 helper。
- `app/utils/search/*` — 搜尋 document mapping、tokenizer、MiniSearch options 與 search result mapping。
- `scripts/build-search-index.ts` — build-time 產生 static search index JSON。
- `public/search-index.json` 或等價 static output — client lazy load 的搜尋 index artifact。
- `app/assets/styles/*.css` — public catalog layout、商品卡片與 responsive styles。
- `tests/published-products.test.ts` — 延伸 published-only、category、sort、filter 測試。
- `tests/search-tokenizer.test.ts` — tokenizer 與 fallback 測試。
- `tests/search-index.test.ts` — search document mapping、index build/load 與查詢測試。
- `tests/client-search.test.ts` — client lazy load retry、完整結果與 autocomplete limit 測試。
- `tests/format-published-date.test.ts` — 日期顯示 timezone 測試。
- `tests/nuxt-smoke.test.ts` — 必要時補 Nuxt UI module 與 static baseline 檢查。

## 介面 / 資料結構（API / Data Structure）

本 sprint 不新增 REST、SSE 或 WebSocket API。資料通訊協定是 static file JSON：generate/build 階段讀取 `content/products/*.json`，輸出 client 可 lazy fetch 的 search index JSON。

Search document input shape：

```json
{
  "id": "2026-06-02-sample-product",
  "name": "商品名稱",
  "description": "推薦文或商品描述",
  "category": "未分類",
  "tags": ["tag-a", "tag-b"],
  "price_text": "NT$ 1,990",
  "purchase_url": "https://example.com/product",
  "image_url": "https://example.com/product.jpg",
  "published_at": "2026-06-02T00:00:00+08:00"
}
```

Search index output shape：

```json
{
  "version": 1,
  "generated_at": "2026-06-06T00:00:00+08:00",
  "documents": [
    {
      "id": "2026-06-02-sample-product",
      "name": "商品名稱",
      "category": "未分類",
      "price_text": "NT$ 1,990",
      "image_url": "https://example.com/product.jpg"
    }
  ],
  "index": {
    "documentCount": 1
  }
}
```

`index` 內容使用 MiniSearch `toJSON()` 產物，實際欄位以 MiniSearch 版本為準；本專案只承諾外層 `version`、`generated_at`、`documents` 與可被 `MiniSearch.loadJSON()` 還原。

Search result UI shape：

```json
[
  {
    "id": "2026-06-02-sample-product",
    "label": "商品名稱",
    "category": "未分類",
    "price_text": "NT$ 1,990",
    "score": 12.34
  }
]
```

Catalog filter state：

```json
{
  "query": "鍵盤",
  "category": "全部",
  "sort": "latest"
}
```

Sort enum：

```json
["default", "latest", "name"]
```

`default` 是 implicit category sort，排序規則為 `category ASC` → `published_at DESC` → `name ASC`；不提供獨立 `category` sort enum。外部輸入 `category` sort 時視為 invalid 並 fallback 到 `default`。

## 邊界案例

- Case 1：沒有任何 published 商品。處理方式：首頁顯示無商品空狀態，不渲染空 category section。
- Case 2：搜尋 query 空白。處理方式：不執行 MiniSearch query，顯示目前 category + sort 下的商品列表。
- Case 3：搜尋無結果。處理方式：顯示空結果狀態，保留搜尋 query 與清除操作。
- Case 4：瀏覽器不支援 `Intl.Segmenter`。處理方式：使用 bigram fallback tokenizer，測試需覆蓋 fallback。
- Case 5：商品缺少 tags 或 description 為空字串。處理方式：mapping 仍可建立 document，搜尋只索引可用文字。
- Case 6：搜尋 index fetch 失敗。處理方式：搜尋建議顯示載入失敗或退回不顯示建議；商品列表仍可依原始 products 瀏覽；失敗後重置 lazy-load promise，下一次搜尋可重新 fetch。
- Case 7：切換 category 後目前搜尋結果沒有商品。處理方式：顯示該 category 下的空結果狀態，而不是重置使用者 query；若命中商品落在 autocomplete 前 12 筆之外，主列表仍以完整搜尋結果 id 集合顯示該商品。
- Case 8：長商品名稱、長 tag 或長價格文字。處理方式：卡片 layout 必須換行或截斷，不可擠壓購買連結或覆蓋其他卡片。

## ADR（Architecture Decision Record）

- 決策：Sprint 2 先做單頁 public catalog，不做商品詳情頁或 modal。
- 原因：目前 product schema 與首頁資料層已可支撐 catalog；詳情頁會引入 routing、內容層次與 View Transition 設計，適合獨立 sprint。
- 替代方案：沿用 `001-revamp` 的 modal 詳情。排除原因：會擴大 UI 狀態與測試範圍，且不是搜尋 baseline 的必要條件。

- 決策：搜尋採 MiniSearch build-time index + client lazy load。
- 原因：商品量預估小到中型，static index 可保留 SSG 模型；MiniSearch 支援 inverted index、`toJSON()` / `loadJSON()`，比 Fuse.js 暴力掃描更適合 build-time artifact。
- 替代方案：Nuxt Content 內建搜尋。排除原因：本 sprint 需要自訂商品欄位、CJK tokenizer 與 autocomplete result shape；MiniSearch 控制面較清楚。

- 決策：搜尋輸入使用 Nuxt UI `UInputMenu`。
- 原因：Nuxt UI 是專案技術棧指定方向，`UInputMenu` 可做 header inline autocomplete，並支援 `ignoreFilter` 讓外部 MiniSearch 接管搜尋結果。
- 替代方案：自製 combobox。排除原因：鍵盤導覽、空狀態、focus 管理與 accessibility 成本較高。

- 決策：tokenizer 使用 `Intl.Segmenter`，bigram fallback。
- 原因：繁中商品名稱與描述需要比 whitespace split 更好的切詞；`Intl.Segmenter` 已是主流瀏覽器 baseline，fallback 可避免舊環境完全失效。
- 替代方案：引入中文斷詞字典。排除原因：bundle 與維護成本高，商品搜尋不需要高精度自然語言斷詞。

- 決策：Search document id 以 content JSON 檔名 stem 為 canonical id。
- 原因：Nuxt Content runtime 與原始 JSON 內部 `id` 可能不同；以檔名 stem 對齊 `getCatalogProductId()` 可避免搜尋結果與 catalog 商品卡無法對應。
- 替代方案：擴大 Product schema 增加 canonical id 欄位。排除原因：目前只需 build script 讀檔時覆寫 id，沒有擴大 schema 的必要。

- 決策：日期顯示使用 `Intl.DateTimeFormat` 並指定 `timeZone: 'Asia/Taipei'`。
- 原因：避免 SSR 與 CSR 執行環境預設 timezone 不同時，同一個 timestamp 顯示成不同日期。

## Milestones

### Milestone 1：Catalog state helpers 與測試

> 預期結果：published-only 商品可被分類、搜尋狀態與排序 helper 穩定處理。
> 驗證方式：`pnpm test tests/published-products.test.ts`

- [x] 撰寫/更新測試（Red）：覆蓋 published-only、category filter、sort enum、空 query、空結果與長文字 mapping。
- [x] 實作最小功能（Green）：擴充 catalog helper，輸出 UI 可直接消費的 sections、counts、sort options。
- [x] Refactor 並確認測試維持通過：維持 pure helper，不讓 UI 直接處理 raw Product 狀態組合。

### Milestone 2：Search index、tokenizer 與 lazy load contract

> 預期結果：build/generate 階段可產生 MiniSearch static index，client 可還原並取得搜尋建議。
> 驗證方式：`pnpm test tests/search-tokenizer.test.ts tests/search-index.test.ts`

- [x] 撰寫/更新測試（Red）：覆蓋 `Intl.Segmenter` tokenizer、bigram fallback、document mapping、published-only index、MiniSearch load/query。
- [x] 實作最小功能（Green）：新增 search utilities 與 build script，產生 static index JSON。
- [x] Refactor 並確認測試維持通過：整理 search result shape，確保 index JSON 不包含 draft / unpublished / archived 商品。

### Milestone 3：Nuxt UI 搜尋列與公開首頁 UI

> 預期結果：首頁提供正式 catalog layout、搜尋下拉建議、分類切換、排序與空狀態。
> 驗證方式：`pnpm test`、`pnpm generate`

- [x] 撰寫/更新測試（Red）：補 Nuxt UI module / search config smoke，必要時加入 component-level 或 DOM smoke。
- [x] 實作最小功能（Green）：加入 Nuxt UI、`UInputMenu` 搜尋列、category controls、sort controls、商品卡片與空狀態。
- [x] Refactor 並確認測試維持通過：整理 template 狀態命名，避免 category/search/sort 邏輯散落在 template。

### Milestone 4：Responsive polish 與 static 驗收

> 預期結果：手機、平板、桌面版面可用，static output 仍不含 Google Sheets runtime reference。
> 驗證方式：`pnpm test`、`pnpm generate`、`node scripts/assert-runtime-google-sheet-clean.ts`

- [x] 撰寫/更新測試（Red）：補長文字、空狀態或 static artifact 驗收。
- [x] 實作最小功能（Green）：完成 responsive styles、focus/hover states、loading/failure states。
- [x] Refactor 並確認測試維持通過：清理未使用樣式與過度抽象，更新 README 或 works.md。
