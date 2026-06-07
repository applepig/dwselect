# Sprint 3：Legacy Data Cutover Validation Works

## 2026-06-07

### Red

- 新增 migration cutover contract 測試：原先驗證 repo 內 TSV snapshot；使用者決策更新後，改為 inline fixture 驗證 migration summary、0 skipped、slug collision，且每筆 `id` 等於 filename stem。
- 新增 content/schema cutover 測試：驗證 `content/products/` 為 66 筆真實 JSON、sample product 不存在、所有 product 通過 `product_schema`。
- 新增 public catalog/search 驗收測試：驗證 `Sharp 65吋 XLED`、分類 `影音`、tag `PCHome` 可透過 catalog/search index 查詢，且 `public/search-index.json` document count 與 published content count 一致。
- 新增 Nuxt smoke static artifact 測試：驗證真實商品名稱、分類與 search index artifact 存在，且 sample product 已移除。
- Red 驗證結果：
  - `pnpm test tests/migrate-google-sheet-products.test.ts tests/product-schema.test.ts`：第一次預期失敗，原因為 `legacy/products.tsv` 不存在與 content 仍只有 1 筆 sample；決策更新後再次失敗點確認為舊測試仍讀取已移除 TSV。
  - `pnpm test tests/search-index.test.ts tests/published-products.test.ts`：預期失敗，原因為 content/search index 仍是 sample。
  - `pnpm test`：預期失敗，9 failed、53 passed。

### Green

- 使用者確認 TSV 以後不會使用，因此不保留 `legacy/products.tsv`；後續 cutover snapshot 與 SSOT 是 66 筆 `content/products/*.json`。
- 使用固定 cutover date 執行 migration：

```bash
node scripts/migrate-google-sheet-products.ts <one-time-input.tsv> --date 2026-06-02 --out-dir content/products
```

- Migration summary：
  - Created：66
  - Skipped：0
  - Slug collisions：
    - row 28：`2026-06-02-ikea` → `2026-06-02-ikea-2`
    - row 40：`2026-06-02-iris` → `2026-06-02-iris-2`
    - row 62：`2026-06-02-panasonic` → `2026-06-02-panasonic-2`
- 移除 `content/products/2026-06-02-sample-product.json`，並產生 66 筆真實 product JSON。
- 重新產生 search index：

```bash
pnpm build:search-index
```

- Search index summary：`Documents: 66`。
- 從 git index 與工作樹移除 staged 新檔 `legacy/products.tsv`，避免 trailing empty `reference` 欄造成 `git diff --cached --check` snapshot 噪音。
- 調整 `tests/migrate-google-sheet-products.test.ts`：不再讀取 repo 內 TSV，改用 inline fixture 驗證 legacy header shape、collision summary、omitted final reference column 與 filename/id contract。

### Refactor / 驗證

- 未調整 migration script；維持 header-name based 欄位讀取，且未新增 runtime Google Sheets dependency。
- 驗證 canonical id、category、tags 與 search document mapping：
  - `Sharp 65吋 XLED` id 為 `2026-06-02-sharp-65吋-xled`。
  - category 為 `影音`。
  - tags 為 `電視`、`影音`、`PCHome`。
- 驗證命令與結果：
  - `pnpm test tests/migrate-google-sheet-products.test.ts tests/product-schema.test.ts`：19 passed（TSV 移除後重新驗證）。
  - `pnpm test tests/search-index.test.ts tests/published-products.test.ts`：22 passed。
  - `pnpm test`：62 passed。
  - `pnpm generate`：通過；Nuxt Content processed 66 files，search index documents 66，產生 `.output/public`。
  - `node scripts/assert-runtime-google-sheet-clean.ts`：通過，沒有輸出錯誤。
  - `git diff --check`：通過。
  - `git diff --cached --check`：通過，確認 staged diff 不再受 trailing tab 影響。

### 未解風險

- 真實圖片仍使用 legacy source URL，可能存在 hotlink、過期、403 或尺寸不一致；本 sprint 只驗證 UI/generate 不崩潰，不處理圖片本地化。
- `pnpm generate` 仍顯示既有 sourcemap / Rollup comment warnings，但不影響本次驗收通過。

### xreview 修正：嚴格 TSV 欄數

- xreview finding：`scripts/migrate-google-sheet-products.ts` 的 `getNormalizedColumns()` 會在 row 少一欄且最後 header 是 `reference` 時自動補空字串；若缺的是中間 tab（例如缺 `price`），可能讓 URL 欄位左移，產生 schema 通過但欄位錯位的商品 JSON。
- 使用者決策：TSV 後續不再使用，採最小嚴格欄數修正；不再支援省略最後 `reference` 欄。
- 修正摘要：移除欄位補齊容錯，row 欄數不等於 header 欄數時一律 warning + skip；測試改寫省略尾端 `reference` 應 skip，並新增缺中間 `price` 欄造成 URL 左移的 regression。

### Hotfix：以 legacy index 入口重做 cutover

- 問題：舊 cutover 的檔名對中文／日文商品退回 `product-<hash>`，且使用者觀察到部分圖片與商品對不上，需要以舊站實際使用的資料來源重新轉檔。
- 修正：`scripts/migrate-google-sheet-products.ts` 支援 `legacy/index.html` 作為 input，會抽出舊站 `google_tsv_url` 重新抓取資料；TSV parser 改為逐字元解析 quoted field，避免欄位內換行造成錯行；slug 改為保留 Unicode letter/number，避免 CJK 商品名落入 hash fallback。
- 重做：執行 `node scripts/migrate-google-sheet-products.ts legacy/index.html --date 2026-06-02 --out-dir content/products --replace`，產生 66 筆 product JSON，並以 `pnpm build:search-index` 重建 search index。
- 其他：移除誤產生的 ignored `./--port` Nuxt artifact directory（使用 `trash-put`）。
