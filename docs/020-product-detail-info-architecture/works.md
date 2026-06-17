# Works

## 2026-06-16

- 初始觀察：以 agent-browser 檢查 `ADATA 行動電源` 詳情頁 mobile 與 desktop，確認 back button 視覺位置需要調整，detail 資訊順序也需要整理。
- 初始誤判：曾假設「AI 怎麼說」可用 runtime `detail.description`，但使用者提醒 `content/AGENTS.md` 已明確定義 `summary`／`long_description`／`llm_description` 責任分工。
- 資料流確認：`product_schema` 與 `public/api/content.json` 皆保留 `summary`、`long_description`、`llm_description`；問題集中在 runtime view model 將 `summary` 改名為 `dw_says`、將 `long_description` 改名為 `description`，且沒有把 `llm_description` 帶入 detail UI contract。
- 內容現況統計：62 筆 product 目前皆有 `summary` 與 `long_description`，但 62 筆皆為 `summary === long_description`，且 `llm_description` 皆為空字串。這是既有資料尚未重新填充，不應成為 runtime mapping 模糊化的理由。
- 架構決策：本 sprint 不只修 detail UI，而是先整理 build-time frontend-ready payload，讓 SSG build process 產生 home card、detail、related products、navigation 所需 payload，Nuxt runtime 不再做多層 product mapping。
- 文件更新：重寫 `spec.md`，將 scope 定義為 frontend-ready product payload 與 detail IA，並明確禁止 `dw_says`／泛用 `description` 回歸。
- Bad smell review（`/simplify`，4-agent 平行）：派 reuse／simplification／efficiency／altitude 四個獨立 agent 審整條 product → UI 資料流。結論——spec 020 對 GPT 過度抽象的診斷正確且被坐實（raw `Product[]` payload、`dw_says`／`description` 改名、`PublishedProductCard` 撐三用途塞 placeholder、fallback search 依賴模糊 `description`、related／navigation runtime 重算）。已抽查實際程式碼確認非幻覺：`product-detail-payload.ts:24-28` 確實塞 `description:null`／`purchase_link:''`；`compareNullableTimestampDesc` 4 份、product id 抽取 3 份、`dw_says` 滲透 4 處、三個 composable 三把 cache key。
- 額外 findings（原 scope 外，已補進 spec「Additional Bad Smells」）：共用 helper 重複（comparators／id 抽取／`compareText`／`getPrimaryOffer`／image resolver／label map）、composable cache key 分歧、build script 雙讀、`isPublished` 散落。校正：62 筆 product，成本在語意與維護性而非效能，不以效能為修復理由。
- 決策（使用者）：將額外 findings 補進 020 Milestones 後直接派工執行。Milestones 由 5 條擴為 7 條：M1 共用 helper 收斂、M2 build-time payload mapper、M3 runtime 改讀 payload＋統一 cache key、M4 build script 去重、M5 detail UI IA、M6 tests、M7 gates＋agent-browser。
### M1 完成

- 新建 `app/utils/content/`：`extract-content-id.ts`、`compare-nullable-timestamp-desc.ts`、`compare-text.ts`、`primary-offer.ts`、`compare-products.ts`（canonical category→date→name）、`compare-guides.ts`（canonical date→name）。中性資料夾讓 `published-products` 與 `search-index` 都能乾淨 import，不互相耦合。
- 去重成果：`compareNullableTimestampDesc` 4→1、id 抽取 3→1、`compareProducts`／`compareGuides` 同名不同行為 2→1 canonical；search-index 改用 `extractContentId`／`getPrimaryOffer`／canonical comparator。淨刪約 104 行。
- 行為變更落地：search-index `documents` 商品 baseline 順序改為 category→date→name；guide tie-break 改 `compareText`。`tests/search-index.test.ts` 於 Red 階段新增測試 pin 新順序（註明 ADR 2026-06-16）。
- `compare-products.ts` 內聯 category sort_order fallback（找不到回 `Number.MAX_SAFE_INTEGER`），避免 `content/` 反向依賴 `published-products`；屬刻意的小重複，記錄於此。
- Deferred 至 M2：image resolver（行為不同，search 版 null 會 throw）、taxonomy label map（find-based vs Map-based）、`getProductTagLabel`/`getContentTagLabel` brands fallback 差異。
- 驗收：Coordinator 實跑 `APP_URL=… pnpm test` → 40 files / 302 tests passed；`pnpm typecheck`、`pnpm lint` 皆 exit 0。未 commit。
- 環境註記：不帶 `APP_URL` 時 `nuxt-smoke`／`view-transition` 等 3 file 會於 import `nuxt.config.ts` 時 throw（commit `2a6db5d` 移除 localhost fallback 的既有行為），與本次無關；測試須帶 `APP_URL` 執行。

### M2+M3 完成（atomic payload migration）

- 規劃：派 Plan agent 完整盤 consume 側，產出 `tasks.md` 施工藍圖。期間發現 spec payload shape 未含 `popular_search_tags`、且 `CompactAppView.search`／`top_tags`／`getSearchProducts` 經查證為 dead code（無 page 消費）。據此補 ADR 決策：popular_search_tags 下沉 payload、刪 dead search 路徑、card/detail `price_label` 統一 `price.label ?? price_text`、RSS/sitemap 改吃 raw source、composable 統一 key + computed 切片。
- 執行：單一 ddd-developer 一次完成，內部 build-side→runtime-side。新建 `app/utils/public-content-view-types.ts`（三 view model）、`app/utils/content/taxonomy-labels.ts`（單一 Map-based label resolver，build mapper 與 search-index 共用）、`scripts/public-payload/`（6 個 mapper）。刪除 `published-products/{shared,product-detail,product-detail-payload,catalog-shell-summary,tags}.ts` 與對應測試（覆蓋轉移至 `tests/public-payload/*`）。
- 偏離 tasks：`taxonomy-labels.ts` 放 `app/utils/content/` 而非 `scripts/public-payload/`，因 app 層 search-index 不應 import scripts——合理。
- Coordinator 驗收（自跑）：`pnpm test` 41 files / 306 passed、`typecheck` 0、`lint` 0、`pnpm generate` 成功。`jq` 檢查 `content.json`：card 欄位為 `*_label`/`image_url`/`tag_labels`（無 `category`/`description`/`purchase_link`）、detail 有 `summary`/`long_description`/`llm_description`/`buy_url`、related 恰 5 欄無 placeholder、navigation 含 `popular_search_tags`、counts.products=62。production code grep 無 `dw_says`/`buy_cta`/`purchase_link`/`PublishedProductCard` 殘留。spec bad smell 清單結構上已清除。
- 新 mapper reuse 檢查：全面複用 M1 `content/` helper，無顯著新重複，simplify 步驟通過。
- Commit hygiene 註記：M3 改的 `product-card.vue`、`nuxt-smoke.test.ts` 與 sprint 019 未提交的視覺變更在同檔交錯 hunk，無法乾淨分離。

### M1 範圍校正（使用者指正）：同名不同行為的 `compareProducts`／`compareGuides` 也是 bad smell，不該放著。查證：search-index 的 `compareProducts` 排 date→name 並進 `documents` summary，等於搜尋 baseline 顯示順序；catalog 端是 category→date→name。使用者裁定「統一成單一 canonical comparator」而非改名保留差異——product 統一 category→date→name、guide date→name、tie-break 統一 `compareText`。**後果：搜尋 baseline 商品順序會改變（user-visible）**；search-index 既有測試需在 Red 階段更新為新順序，屬刻意行為變更，非 Green 階段作弊。

## 2026-06-17

### M4～M6 完成

- M4：新增 `scripts/build-public-artifacts.ts` 作為正常 `build`／`generate` workflow 的 public artifact 入口；它只呼叫一次 `readPublicContentSource()`，再把同一份 source 交給 `buildSearchIndexFileFromSource()` 與 `buildPublicDiscoveryFilesFromSource()`。保留 `build:search-index` 與 `build:public-discovery` 作為單獨 CLI。
- M5：重排 `app/components/product-detail.vue` 資訊架構為產品名稱 → 分類／通路 → 標籤 → 價格 → DW 怎麼說 → AI 怎麼說 → CTA → fine print；back button 移入 hero tile overlay，CSS 使用同一個 `--detail-back-inset` 控制上下與左右 inset。
- M6：擴充 `public-discovery`／`nuxt-smoke`／`product-detail-back-navigation` 測試，鎖定 combined artifact wiring、單次 source read 結構、detail 欄位語意與 UI source order，避免 `dw_says`／`detail.description` 回歸。
- Red 階段：先跑 `APP_URL=dwselect.toybox.local pnpm test tests/public-discovery.test.ts tests/search-index.test.ts tests/nuxt-smoke.test.ts tests/product-detail-back-navigation.test.ts`，如預期 6 個測試失敗（缺少 combined script、package wiring 未改、detail order/back button 未符合）。
- 驗證結果：相關測試 4 files / 66 tests passed；完整 `pnpm test` 41 files / 309 tests passed；`pnpm lint` exit 0；`pnpm typecheck` exit 0；`pnpm generate` 成功產生 `.output/public`（僅 Vite／Rollup 既有 sourcemap／PURE annotation warnings）。
- M7 驗收（coordinator）：實跑 `APP_URL=dwselect.toybox.local pnpm test` → 41 files / 309 tests passed；`pnpm lint`、`pnpm typecheck` 皆 exit 0；`pnpm generate` 成功，workflow 已走 `build:public-artifacts` 並產生 67 documents、62 products、2 guides、3 links；`node scripts/assert-runtime-google-sheet-clean.ts` exit 0。
- agent-browser 驗收：使用既有瀏覽器 tab，透過 `https://dwselect.toybox.local/products/2026-06-02-adata-power-bank` 驗收 mobile 390x844 與 desktop 1440x1000。兩者皆可載入；detail DOM 順序為 title → meta → tags → price → DW → CTA → fine print；`llm_description` 為空時 AI 區塊不顯示；back button 相對 hero tile 皆為 top 12px／left 12px／44px。截圖：`/home/applepig/.agent-browser/tmp/screenshots/screenshot-1781632319236.png`、`/home/applepig/.agent-browser/tmp/screenshots/screenshot-1781632361995.png`。
- 注意事項：agent-browser console 含先前 dev server HMR 歷史錯誤紀錄；本次重新開頁後 DOM、互動快照與座標檢查皆正常，未阻塞 M7 驗收。

### UI hotfix：card 三行、taxonomy chips、DW 對比

- 問題：iPad 首頁卡片原本 `product-name` 固定 2 行、`product-summary` 只顯示 1 行，短 title 會留下空白行且摘要內容不足；detail taxonomy 被拆成 channel badge、category badge、tag link 三套外觀；`DW 怎麼說` 使用 Nuxt UI primary subtle，在 light theme 橘字低可讀性。
- 根因：卡片 line clamp 與 block-size 配置不符合「固定三行文字」預期；detail taxonomy 沒有共用 chip component；DW 區塊未以本站 token 明確指定 readable foreground/background。
- 修復：新增 `TaxonomyChip` 共用外觀且由 caller 傳 `to`，避免硬寫路由；detail 以單一 row 排 category → channel → tags，其中 category 連 `/?category=...`、channel/tag 連 `/search?q=...`；卡片改為 title 1 行 + summary 2 行；DW 區塊改用 `--dw-panel-strong` + `--dw-text`。
- 測試：先跑 `APP_URL=dwselect.toybox.local pnpm test tests/nuxt-smoke.test.ts` 看到 3 個預期失敗（缺 `TaxonomyChip`、detail row 未合併、卡片行數不符），修復後同檔 34 tests passed；完整 `pnpm test` 41 files / 310 tests passed；`pnpm lint`、`pnpm typecheck` 皆 exit 0。
- agent-browser 驗收：iPad 834x1194 首頁第一張 card 實測 name 1 行（21.59px）、summary 2 行（44.63px）；detail taxonomy row 同列顯示 `電腦3C`、`PChome`、`ADATA`、`電源充電`，連結分別為 `/?category=computer-3c`、`/search?q=PChome`、`/search?q=ADATA`、`/search?q=電源充電`；light theme DW 區塊實測對比 15.51:1，通過 WCAG AA。截圖：`/home/applepig/.agent-browser/tmp/screenshots/screenshot-1781633410581.png`、`/home/applepig/.agent-browser/tmp/screenshots/screenshot-1781633448181.png`。
- 校正：使用者指出首頁仍只有兩行，原因是前一版把「三行」誤解為 title + summary 合計三行；已改為 title 1 行、summary 本身 3 行。iPad 834x1194 重新實測前 5 張 card：summary height 66.95px、line-height 22.32px、`-webkit-line-clamp: 3`。驗證：`tests/nuxt-smoke.test.ts` 34 passed；完整 `pnpm test` 41 files / 310 tests passed；`pnpm lint`、`pnpm typecheck` 皆 exit 0。
- 校正：使用者指出 detail back icon 沒有對齊在圓圈中央。agent-browser 量測確認 Nuxt UI `UButton` 預設 `padding: 6px` 且 `justify-content: normal`，造成 icon 水平中心偏左 5px；已在 `.detail-back` 明確設定 `display: inline-flex`、`align-items: center`、`justify-content: center`、`padding: 0`。修復後實測 button 44x44、icon 20x20、offset 12/12、center offset 0/0。驗證：`tests/nuxt-smoke.test.ts` + `tests/product-detail-back-navigation.test.ts` 36 passed；`pnpm lint`、`pnpm typecheck` 皆 exit 0。

### PR CI 修正

- 問題：PR #5 的 GitHub Actions `Static Generate / quality-gate` 在 `pnpm install --frozen-lockfile` 階段失敗，因 `prepare: nuxt prepare` 會載入 `nuxt.config.ts`，但 workflow 未提供 `APP_URL`。
- 根因：`APP_URL` 缺失發生在 install/prepare 階段，不是 tests、lint、typecheck 或 generate 本身失敗。初步修正時誤用開發站 `dwselect.toybox.local`，使用者校正正式站應為 `dwselect.applepig.net`。
- 修復：在 `.github/workflows/static-generate.yml` 的 `quality-gate` job 設定 `APP_URL: dwselect.applepig.net`，並於 `tests/static-generate-workflow.test.ts` 鎖定 workflow 必須在 install 前提供正式站 APP_URL。
- 文件：更新 `CLAUDE.md` 記錄 host 分工：`dwselect.toybox.local` 是本機／開發站，`dwselect.applepig.net` 是正式站；CI、production build、deploy、SEO canonical 或公開正式環境設定不可使用開發站 host。
- 驗證：`APP_URL=dwselect.toybox.local pnpm test tests/static-generate-workflow.test.ts` 通過，`APP_URL=dwselect.toybox.local pnpm lint` 通過。

### UI hotfix：pill 元件收斂與 product card 通路搜尋

- 問題：使用者指出 product card 上的 price/channel pill 仍顯得左右 padding 很窄，且 DOM class 仍出現 Nuxt UI `UBadge` 注入的 Tailwind utility（如 `text-[10px]/3 px-1.5 py-1`）。同時通路 pill 應可連到 search by 通路，但先前未實作。
- 根因：外觀相似的 pill 分散在不同元件與樣式來源：category/tag filter 用 `UButton`，detail taxonomy 用 `TaxonomyChip`，product card price/channel 用 `UBadge` 再靠一般 CSS 覆蓋，導致 padding／link 行為漏改。
- 修復：新增 `CatalogPill` 作為 link/span 共用 pill 元件，detail taxonomy 與 product card price/channel 改用同一元件；移除舊 `TaxonomyChip` 與 `.taxonomy-chip` CSS；product card channel pill 改為 `/search?q={channel_label}` link，price pill 維持非 link span；product card meta 不再被整張商品詳情 link 包住，避免 nested links。
- 驗證：`APP_URL=dwselect.toybox.local pnpm test tests/nuxt-smoke.test.ts`、`tests/nuxt-ui-component-adoption.test.ts` 通過；`APP_URL=dwselect.toybox.local pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts` 通過（新增 product card channel pill 搜尋導覽測試）；`APP_URL=dwselect.toybox.local pnpm lint` 通過。agent-browser 實測 product card price 為 `SPAN.catalog-pill`、channel 為 `A.catalog-pill[href="/search?q=PChome"]`，無 Nuxt UI badge utility class；`CatalogPill` 改為 responsive：手機左右 padding 10px，tablet/desktop 14px。

### UI hotfix：filter chip 尺寸、theme-aware channel pill、detail breadcrumb

- 問題：iPad mini 首頁分類 chip 曾在初次載入時斷字換行，且即使正常顯示也顯得上下太多、左右不夠；product card 通路 pill 使用固定深色，未隨 light/dark theme 反相；product detail route 的 header breadcrumb 只顯示 fallback `商品詳情`。
- 根因：filter chip 繼承 `UButton` 後又套用 `overflow-wrap:anywhere`／`word-break:break-word`，CJK label 在字型／hydration 時序下容易被拆字；chip 視覺高度仍是 44px，不符合常見 UI framework chip/button 約 32–38px 高、水平 padding 大於垂直 padding的比例。`catalog-pill--dark` 使用固定黑白色，不吃 theme token。Detail breadcrumb 依賴 page state，direct route／SSR 時 layout 先渲染 fallback，沒有穩定取得產品資料。
- 修復：filter chip 改為 38px 高、左右 20px、`white-space: nowrap`、`word-break: keep-all`，讓整顆 chip 換行而非文字斷行；`catalog-pill--dark` 改用 `var(--dw-text)`／`var(--dw-bg)` 反相色，隨 theme 切換；`useCatalogShellData()` 提供小型 `product_breadcrumb_items_by_id` map，layout 直接由 route product id 產生 `DW嚴選 > 分類 > 商品名`，分類 breadcrumb 可連回 category filter。
- 驗證：`APP_URL=dwselect.toybox.local pnpm test tests/nuxt-smoke.test.ts tests/nuxt-ui-component-adoption.test.ts` 通過；`APP_URL=dwselect.toybox.local pnpm test:e2e --project=desktop tests/e2e/compact-app.spec.ts --grep "product detail route"` 通過；`APP_URL=dwselect.toybox.local pnpm lint` 通過。agent-browser 以 iPad mini 768×1024 實測分類 chip 高 38px、左右 padding 20px、不換行；直開 detail 顯示 `DW嚴選 > 電腦3C > ADATA 行動電源`；dark theme channel pill 背景／文字隨 theme token 反相。
- 校正：使用者指出 product card 價格 pill 也應跟分類 primary chip 一樣 theme-aware，不能只修通路 pill。`catalog-pill--accent` 改為 `background: var(--ui-primary)`、`color: var(--ui-text-inverted)`，移除固定 `#231405`；這讓 price pill 與 Nuxt UI primary/category chip 使用同一組 primary / inverted theme token。
