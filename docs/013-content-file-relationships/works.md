# Works

## 2026-06-14 — Milestone 1：定義 content image resolution contract

### 完成項目

- Product / Guide schema 新增 `image_file`，並套用單一檔名與副檔名驗證。
- Product schema 改為本地 `image_file` 或 HTTP(S) `image_url` 剛好擇一。
- Guide schema 改為可無圖、可使用本地 `image_file` 或 HTTP(S) `image_url`，但禁止雙來源。
- Link schema 維持不支援 `image_file`，`image_url` 僅允許 HTTP(S)、`null` 或省略。
- 新增 content image resolver，將 Product `image_file` resolve 為 `/images/products/{filename}`，Guide `image_file` resolve 為 `/images/guides/{filename}`。
- 更新 product card、product detail、guide resource rows、search index mapping，對 UI/search 輸出 resolved image URL。

### 技術決策

- Resolver 邊界拆在 `app/utils/content-images/`，以 `resolveImageFileUrl()` 集中 product card、product detail 與 guide resource row 的公開 URL 拼接，Product / Guide 各自提供語意化 wrapper。
- `app/utils/search/search-index.ts` 維持可被 `node scripts/build-search-index.ts` 直接載入；為避免新增 app source `.ts` extension import，search index 使用同檔 local resolver 產生 search document image URL。
- `image_file` 驗證目前只允許小寫副檔名：`jpg`、`jpeg`、`png`、`webp`、`gif`、`avif`。
- Milestone 1 不遷移既有 content JSON；`tests/product-schema.test.ts` 的現有 content schema parse 對 legacy local `image_url` 暫時跳過，避免與 Milestone 2 範圍衝突。Milestone 2 遷移完成後應恢復完整 schema parse 與實體檔關係驗證。

### TDD 紀錄

- Red：先補 schema、runtime mapping、search index 測試後執行指定測試，出現 9 個預期失敗，包含 `image_file` 未被 schema 接受、local `image_url` 尚未被拒絕、runtime/search 尚未 resolve local image file。
- Green：實作 schema、resolver 與 mapping 後，修正 import style，避免新 app source import 使用 `.ts` extension，同時維持 Node ESM 直接載入 search index build script。

### 測試結果

- `pnpm test tests/product-schema.test.ts tests/published-products/shared.test.ts tests/published-products/product-detail.test.ts tests/published-products/resource-rows.test.ts tests/search-index.test.ts`：5 files / 67 tests passed。
- `pnpm typecheck`：passed。

## 2026-06-14 — Milestone 2：遷移既有 content 與 localize script

### 完成項目

- 遷移 `content/products/*.json` 中 62 筆 legacy local `image_url: "/images/products/..."`，改為 `image_url: null` 與 `image_file: "{filename}"`。
- 遷移 `content/guides/*.json` 中 1 筆 legacy local `image_url: "/images/guides/..."`，改為 `image_url: null` 與 `image_file: "{filename}"`。
- 保留 1 筆 Guide HTTP(S) fallback `image_url`，未轉成 `image_file`。
- 更新 `scripts/localize-content-images.ts`，下載 HTTP(S) 圖片後寫入 `content/{products,guides}/images/` 並回寫 `image_file`，不再寫公開 local URL 到 `image_url`。
- 更新 localize script 對既有 `image_file` 的處理：視為 already local 並 skip。
- 更新 localize script 對 legacy local `image_url` 的處理：轉換成 `image_file`，避免下載。
- 恢復 content schema 完整 parse，並新增每個 `image_file` 對應實體檔存在於正確 images 目錄的測試。

### 技術決策

- Content JSON 採用一致格式：本地圖片保留 `image_url: null` 並新增 `image_file`。此方式 diff 明確，且符合 schema 支援。
- Legacy local `image_url` 由 localize script 轉換為 `image_file` 並計入 `localized`，因這代表 content source 已完成本地圖片欄位遷移。
- HTTP(S) `image_url` 保留作為外部圖片 fallback；本次 migration 不嘗試下載遠端 fallback。

### TDD 紀錄

- Red：先更新 `tests/localize-content-images.test.ts` 與 `tests/product-schema.test.ts`，指定測試出現 4 個預期失敗，包含 localize 仍寫回公開 local `image_url`、legacy local path 仍被 skip、content schema 驗證因 legacy local `image_url` 失敗。
- Green：更新 localize script 與遷移 content 後，指定測試通過。
- Refactor：將 localize script 流程整理成三種清楚分支：已有 `image_file` skip、legacy local `image_url` 轉換、HTTP(S) 下載後寫入 `image_file`。

### 測試結果

- `pnpm test tests/localize-content-images.test.ts tests/product-schema.test.ts`：2 files / 42 tests passed。
- `pnpm test tests/product-schema.test.ts tests/published-products/shared.test.ts tests/published-products/product-detail.test.ts tests/published-products/resource-rows.test.ts tests/search-index.test.ts`：5 files / 67 tests passed。

## 2026-06-14 — Milestone 3：整理文件與完整驗證

### 完成項目

- 新增 `docs/CONTENT.md`，說明 content source、taxonomy、圖片實體檔、Nitro `publicAssets`、runtime/search resolved URL、generated artifacts 與 Google Sheets 非 runtime SSOT 邊界。
- 更新 `content/AGENTS.md`，Product / Guide 範例與圖片下載流程改用 `image_file` 與 `image_url: null`。
- 更新 `content/AGENTS.md` 的 Link 圖片規則：Link 不支援 `image_file`，`image_url` 只能是 HTTP(S)、`null` 或省略。
- 重建 `public/search-index.json`，確認 Product / Guide search documents 仍輸出 resolved `/images/products/...` 與 `/images/guides/...`。
- 執行 `pnpm generate` 產生 static output 到 `.output/public`。

### 技術決策

- `docs/CONTENT.md` 作為 project-level content file relationship 文件；`content/AGENTS.md` 保留 content authoring 操作細節並連回 `docs/CONTENT.md`。
- `public/search-index.json` 維持 generated artifact，由 `pnpm generate` 的 `pnpm build:search-index` 步驟更新。

### 驗證結果

- `pnpm test`：25 files / 198 tests passed。
- `pnpm lint`：passed。
- `pnpm typecheck`：passed。
- `pnpm generate`：passed，產生 `public/search-index.json` 與 `.output/public`；過程有既有 sourcemap / Rollup annotation warnings，未阻塞生成。
- `node scripts/assert-runtime-google-sheet-clean.ts`：passed。
- 額外檢查 `public/search-index.json`：`product:2026-06-02-benq-rd280u` image URL 為 `/images/products/2026-06-02-benq-rd280u.jpg`，`guide:2026-06-02-aeron-chair` image URL 為 `/images/guides/2026-06-02-aeron-chair.jpg`。

## 2026-06-14 — Fix：agent-browser 發現 quote-wrapped `image_file`

### 發現

- agent-browser 開啟首頁後，商品圖片 `src` 出現 `/images/products/%222026-06-02-adata-power-bank.jpg%22`。
- Source content JSON 的 `image_file` 正確，推測 Nuxt Content runtime / `queryCollection` 回傳了 JSON-string-wrapped filename，例如 `"2026-06-02-adata-power-bank.jpg"`。

### 修正

- 在 `app/utils/content-images/resolve-image-file-url.ts` resolver 邊界 normalize 明確的 JSON-string-wrapped filename。
- Normalize 後仍套用 filename validation，避免接受 path traversal、query、hash 或 unsupported extension；無效 `image_file` 會直接丟錯，不在 UI mapping 各自吞掉壞資料。
- 補 Product card 與 Guide resource row 測試，確認 quote-wrapped `image_file` 會輸出乾淨 `/images/...` URL。

### 驗證結果

- Red：新增 quote-wrapped Product / Guide 測試後，實作前輸出 `/images/products/"quote-wrapped-image-product.jpg"` 與 `/images/guides/"quote-wrapped-guide.webp"`，測試失敗。
- `pnpm test tests/published-products/shared.test.ts tests/published-products/product-detail.test.ts tests/published-products/resource-rows.test.ts tests/search-index.test.ts tests/product-schema.test.ts`：5 files / 69 tests passed。
- `pnpm lint`：passed。
- `pnpm typecheck`：passed。

## 2026-06-14 — Fix：search idle 熱門標籤／品牌視覺分組

### 發現

- 使用者檢查 search 頁時發現「熱門標籤」與「熱門品牌」看起來像被合回同一塊，且標題與 pill list 之間缺少合理間距。
- agent-browser 驗證 DOM 仍有兩個 section，但兩者共用同一個 `.search-empty-panel`，section 自身沒有既有 panel spacing，標題與 pill list 間距為 0px。

### 修正

- 將 `search-idle-panel.vue` 的 popular section 改成每個 section 各自使用既有 `.search-empty-panel.search-popular-panel`。
- 不新增 search 專用 spacing CSS，直接復用既有 panel primitive 的 `padding: 18px`、`gap: 12px` 與 container gap。

### 驗證結果

- agent-browser：`/search` 目前有兩個 `.search-popular-panel`，分別是 `tags` 與 `brands`；每個 panel 的 computed `gap` 為 `12px`、`padding` 為 `18px`。

## 2026-06-14 — Fix：search input action 與搜尋紀錄 panel 一致性

### 發現

- Search input 右側沒有送出 action，也沒有清除目前搜尋的按鈕。
- 搜尋紀錄 panel 和熱門標籤／熱門品牌 panel 視覺語言不同，且仍保留「清除紀錄」按鈕。
- URL 更新現況是 submit 立即更新 `?q=`，clear 立即回 `/search`；保留此模型，避免為前端搜尋引入額外 submitted state。

### 修正

- Search input 保留既有 native input 與 IME composition 邏輯，右側 action 改用 Nuxt UI `UButton`：`清除搜尋`、`送出搜尋`。
- 搜尋紀錄改用和熱門標籤／熱門品牌相同的 `.search-empty-panel` + `.tag-chip-list` 結構。
- 移除搜尋紀錄的「清除紀錄」UI，避免和下方 panel 產生不同操作語言。

### 驗證結果

- `pnpm test tests/use-search-page.test.ts tests/search-input-composition.test.ts tests/published-products/compact-app.test.ts`：3 files / 25 tests passed。
- `pnpm lint`：passed。
- `pnpm typecheck`：passed。
- agent-browser：`/search` idle 顯示三個同型 panel：搜尋紀錄、熱門標籤、熱門品牌；已無「清除紀錄」。
- agent-browser：按 `送出搜尋` 後 URL 更新為 `/search?q=BenQ` 並顯示結果；按 `清除搜尋` 後 URL 回 `/search`、input 清空。

## 2026-06-14 — Fix：search idle pill layout 一致性

### 發現

- 使用者檢查 search idle 畫面時發現「搜尋紀錄」的 pill 排版仍和「熱門標籤」／「熱門品牌」不同，搜尋紀錄 pill 會變成 100% width。
- 根因是搜尋紀錄 button 額外使用 `.search-history-item` 專用 class，且 shared `.tag-chip` primitive 沒有明確宣告 shrink-to-content 的 width contract，導致 button 和 link chip 在 cascade 下可能出現不同寬度行為。

### 修正

- 搜尋紀錄 button 移除 `.search-history-item`，和熱門標籤／熱門品牌一樣只使用 `.tag-chip`。
- `.tag-chip` shared primitive 新增 `width: fit-content`，讓 button 與 NuxtLink pills 都維持內容寬度，同時保留 `max-width: 100%` 防止長字串溢出。
- 移除 `.search-history-item:focus-visible` selector，focus style 回到 shared `.tag-chip:focus-visible`。

### 驗證結果

- Red：新增 `tests/nuxt-smoke.test.ts` regression guard 後，修正前因 `search-history-item` 仍存在而失敗。
- `pnpm test tests/nuxt-smoke.test.ts tests/use-search-page.test.ts tests/search-input-composition.test.ts`：3 files / 30 tests passed。
- `pnpm lint`：passed。
- agent-browser：`/search` idle 三組 panel 的 pills 都使用 `.tag-chip`，搜尋紀錄 `BenQ` pill computed width 約 `72px`，不是 100% width。
