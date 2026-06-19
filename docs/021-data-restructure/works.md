# Works

## 2026-06-18：3C Content Cleanup

### Scope

- 整理 `computer-3c` 分類商品內容。
- 依使用者指定封存舊商品、新增替換商品、更新 Samsung M7 賣場連結。
- 只更新 content JSON、taxonomy、商品圖片與 generated public artifacts；不修改 production code。

### Changes

- 封存 7 筆商品：
  - `2026-06-02-adata-power-bank`
  - `2026-06-02-avier-power-bank`
  - `2026-06-02-kioxia-1tb-usb-flash-drive`
  - `2026-06-02-msi-desktop-pc`
  - `2026-06-02-synology-ds723-plus`
  - `2026-06-02-j5create-usb-c-charger`
  - `2026-06-02-philips-40b1u5600`
- 新增 3 筆商品：
  - `2026-06-18-adata-c100-power-bank`
  - `2026-06-18-elecom-de-c39-power-bank`
  - `2026-06-18-msi-mag-401qr`
- 更新 `2026-06-02-samsung-m7-32-inch` offer URL 為 `https://24h.pchome.com.tw/prod/DPADEW-A900J29J2`。
- 新增 ELECOM brand taxonomy：`elecom`。
- 依研究結果補齊保留中 3C 商品的 `llm_description`，只寫客觀規格描述，不改寫使用者提供的 `summary`／`long_description`。

### Verification

- `jq empty content/products/*.json content/taxonomies/*.json`
- `pnpm build:content-images`
- `pnpm build:public-artifacts`

結果：JSON 格式有效；content image 生成 `Missing: 0`、`Failed: 0`；public artifacts 產出 `Documents: 63`、`Products: 58`、`Guides: 2`、`Links: 3`。

### Process Note

本次是 CMS/content 整理，不應修改或更新測試基準來配合內容數量變動。後續 content 任務驗證只做 JSON 格式、schema 讀取與 artifact 生成，不把內容筆數當作測試目標。

## 2026-06-18：Remove Data-Count Tests And Update Content Agent Guide

### Scope

- 移除會鎖定 CMS data 筆數、特定 content ID、特定搜尋文件數的 bad tests。
- 保留 schema、taxonomy reference、mapper/search logic、artifact generation 相關測試。
- 更新 `content/AGENTS.md`，記錄 content-only 任務的正確驗證方式與 PChome 查資料 fallback。

### Changes

- 刪除 `tests/content-taxonomy-references.test.ts` 中固定 product 總數與特定 migrated product ID 的測試。
- 刪除 `tests/product-schema.test.ts` 中固定 product／guide／link 檔案清單的 migrated content domain 測試。
- 移除 `tests/product-schema.test.ts` 中針對特定商品 tag 的資料斷言，只保留 legacy tag 不可出現的格式規則。
- 移除 `tests/search-index.test.ts` 中固定 generated static search index 文件數與特定 real content 查詢結果的測試。
- 移除 `tests/nuxt-smoke.test.ts` 中固定 real cutover catalog artifacts 與特定 guide／link 檔名的測試。
- 將 `tests/e2e/compact-app.spec.ts` 的 product detail 測試改為從首頁第一張商品卡或動態 href 進入，不再綁定 `Sharp 65吋 XLED`。
- 更新 `content/AGENTS.md`：content-only 任務只跑 JSON 格式、圖片與 public artifacts 驗證；遇到 content count 類測試失敗時應移除或重構 bad test，不更新 expected count；PChome 429 時先用 PChome 商品 API，再視需要用 agent-browser。

### Verification

- `pnpm test tests/content-taxonomy-references.test.ts tests/product-schema.test.ts tests/nuxt-smoke.test.ts tests/search-index.test.ts tests/published-products/resource-rows.test.ts`
- `pnpm lint:file -- tests/e2e/compact-app.spec.ts`
- `jq empty content/products/*.json content/taxonomies/*.json`
- `pnpm build:content-images`
- `pnpm build:public-artifacts`

結果：目標 Vitest 5 檔全數通過；E2E 檔 lint 通過；content images `Missing: 0`、`Failed: 0`；public artifacts 產出 `Documents: 63`、`Products: 58`、`Guides: 2`、`Links: 3`。

## 2026-06-18：Content Researcher Agent Trial For ELECOM Product

### Scope

- 試派 `dwselect-content-researcher` 研究 `2026-06-18-elecom-de-c39-power-bank`。
- 驗證 subagent 是否遵守 `dwselect-content-authoring`：先讀 skill、只研究不改檔、不改使用者主觀欄位、回報來源與信心。

### Result

- Agent 成功回報 ELECOM DE-C39-12000WH 規格：12000mAh／38.4Wh、磷酸鐵鋰電芯、USB-C PD 20W 輸入／輸出、USB-A 5V 2.4A、雙埠合計 20W、約 78×17×159mm、約 310g、循環壽命約 1000 次。
- Agent 找到官方 reference：`https://www.elecom.co.jp/products/DE-C39-12000WH.html`。
- Agent 找到 ELECOM 直營店 offer：`https://shop.elecom.co.jp/item/4549550254373.html`，價格 `6,980円(税込)`。
- Agent 找到較高品質 Amazon 主圖：`https://m.media-amazon.com/images/I/51ne4p1sAFL._AC_.jpg`。

### Changes

- 更新 `content/products/2026-06-18-elecom-de-c39-power-bank.json` 的 `llm_description`、`search_aliases`、`offers`、`reference_url`。
- 更新本地圖片 `content/products/images/2026-06-18-elecom-de-c39-power-bank.jpg`。
- 未修改 `summary`／`long_description`。

### Verification

- `jq empty content/products/*.json content/taxonomies/*.json`
- `pnpm build:content-images`
- `pnpm build:public-artifacts`

結果：JSON 格式有效；content images `Missing: 0`、`Failed: 0`；public artifacts 產出 `Documents: 63`、`Products: 58`、`Guides: 2`、`Links: 3`。

## 2026-06-18：Refine llm_description Research Standard

### Problem

- 原本 `llm_description` 規範用固定字數與 3C 偏向的規格清單，導致 subagent 輸出容易變成短規格摘要。
- 這不符合 DW嚴選需要的內容：使用者應能掌握產品特色、優缺點、重要規格、評測報告與使用者心得。
- 固定 3C 規格維度也不適合食材、日用品、家電、家具、工具等其他品類。

### Changes

- 將 `.opencode/skills/dwselect-content-authoring/SKILL.md` 的 `llm_description` 定義改為「objective product decision brief」。
- 移除硬性長度限制，改成依產品複雜度寫足資訊，不為字數刪減已查證資訊，也不為字數灌水。
- 新增跨品類 decision dimensions：產品身份、差異化特色、品類關鍵規格、客觀優缺點、適用／不適用情境、評測與使用者回饋、搜尋別名。
- 更新 `.opencode/agents/dwselect-content-researcher.md`，要求 research result 回傳 `decision_factors`，並明確針對不同品類選擇不同研究面向。

### Verification

- `jq empty opencode.json`
- `opencode agent list | rg '^dwselect-content-researcher'`

結果：opencode config JSON 有效；`dwselect-content-researcher` 仍由 markdown agent discovery 載入。

## 2026-06-18：Remove ImageMagick Dependency And Reapply ELECOM Brief

### Problem

- `dwselect-content-researcher` 在圖片研究時仍嘗試使用 ImageMagick (`magick` / `identify`)，但本機未安裝，導致不必要的權限請求與流程中斷。
- 對 content research 而言，圖片尺寸與品質可透過 agent-browser 的 `naturalWidth` / `naturalHeight`、store API、HTTP metadata 或 URL pattern 判斷；無法驗證尺寸時應回報未驗證，而不是要求額外本機工具。

### Changes

- 從 `.opencode/agents/dwselect-content-researcher.md` 移除 `magick *` 與 `identify *` 的 allow 權限。
- 在 `.opencode/skills/dwselect-content-authoring/SKILL.md` 增加圖片檢查 workflow：優先 agent-browser，不要求 ImageMagick。
- 套用新版 ELECOM product decision brief 到 `content/products/2026-06-18-elecom-de-c39-power-bank.json`。
- 保留使用者提供的 Amazon offer URL `https://amzn.asia/d/016upOlk` 與 `price_text: "約¥5000"`，未再用官方商店價格覆蓋。
- 使用 Amazon 去參數高解析圖更新 `content/products/images/2026-06-18-elecom-de-c39-power-bank.jpg`。

### Verification

- `jq empty opencode.json content/products/*.json content/taxonomies/*.json`
- `opencode agent list | rg '^dwselect-content-researcher'`
- `pnpm build:content-images`
- `pnpm build:public-artifacts`

結果：JSON 格式有效；agent 可載入；content images `Missing: 0`、`Failed: 0`；public artifacts 產出 `Documents: 63`、`Products: 58`、`Guides: 2`、`Links: 3`。

## 2026-06-18：Data Restructure 排序語意與 id 穩定性收尾

### Scope

- 收斂 021 sprint scope 為三條資料模型 ADR：公開排序鍵語意（`updated_at`）、Links 排序（`compare-links`）、product `id` 穩定性。
- 實作排序鍵變更與 `compare-links`，並對齊受影響的既有測試。

### Changes（production）

- 排序鍵 `published_at` → `updated_at`：`compare-products.ts`（`category→updated_at→name`）、`compare-guides.ts`（`updated_at→title`）、`map-related-product-card.ts`（`score→same_channel→updated_at→name`）。
- 新增 `app/utils/content/compare-links.ts`：`sort_order` 升序 → `updated_at` desc → `compareText(title)` → `id`。
- `search-index.ts` 與 `scripts/public-payload/map-resource-rows.ts` 的 links 排序改用 `compareLinks`（取代原本只看 `sort_order`）。

### Changes（tests）

- 新增 `tests/content/compare-links.test.ts`（5 case：sort_order 優先、fresher updated_at 不蓋過 sort_order、同 sort_order 內 updated_at desc、title tie-break、id fallback）。
- `tests/public-discovery.test.ts`：cards 排序 expected 依 `updated_at` 後果翻轉為 `['no-published-at-product', '2026-06-02-sample-product']`。
- `tests/nuxt-smoke.test.ts`：detail CTA 文案斷言對齊現況 `去 {{ detail.channel_label }} 逛逛`（前一 commit `f8a6958` 的文案變更）。
- `tests/product-schema.test.ts`：依「`id` 穩定」決策，把 id 一致性斷言放寬為 kebab-slug regex（`^YYYY-MM-DD-<kebab>$`），移除未使用的 local `slugifyEnglishName`。

### Verification

- `pnpm test`：46 files / 337 tests 全綠。
- `pnpm lint`：無錯誤。
- `pnpm typecheck`：PASS（含下方順手修復的 markdown parser）。

### Note

- aibo 商品 `english_name` 經 enrich（`7fa9a2a`）後與精簡 `id` 不再對齊；採「`id` 為穩定 URL key、`english_name` 可獨立演進」決策放寬規則，未改動公開 URL。
- 收尾期間順手修復非 021 scope 的 typecheck 紅燈：`app/utils/markdown/parse-content-markdown.ts`（commit `b1da97f` 遺留）的 9 個 `noUncheckedIndexedAccess` 錯，以 non-null assertion narrow array index 與 regex capture group（迴圈不變量與 match 成功保證），行為不變，`tests/content-markdown.test.ts` 通過。

## 2026-06-18：Data Restructure 完整驗收收尾

### Scope

- 對 021 的資料排序語意、Links 排序、product `id` 穩定性與 public runtime 行為做完整驗收。
- 補齊 UI／routing／generate 層級驗證，確認 021 可以進入完成狀態並銜接 022。

### Verification

- `pnpm test`：46 files / 337 tests 全綠。
- `pnpm lint`：通過。
- `pnpm typecheck`：通過。
- `pnpm generate`：通過；content images `Optimized: 59`、`Missing: 0`、`Failed: 0`，public artifacts `Documents: 63`、`Products: 58`、`Guides: 2`、`Links: 3`，Nuxt prerender 126 routes。
- `node scripts/assert-runtime-google-sheet-clean.ts`：通過。
- `pnpm test:e2e`：60 passed / 12 skipped。
- agent-browser：實際打開 `https://dwselect.toybox.local/`、`/guide`、`/links`、`/search?q=電源充電`、`/products/2026-06-18-elecom-de-c39-power-bank`；desktop 與 mobile 首頁可載入，商品詳情 CTA、官方連結、相關商品與 AI 描述區塊可見，未見 Vite／Nuxt error overlay。

### Result

- 021 驗收完成，可以進入 022。
- `pnpm generate` 會重產 `public/api/content.json` 與 `public/search-index.json` 並留下 generated diff；這是 022 已納入處理的 generated artifact tracking 問題，不列為 021 blocker。
