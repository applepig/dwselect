# Works: 036 detail page fixes

## Milestone 3: share buttons

- **技術決策**：新增 `share-buttons.vue`，分享 URL 唯一由 `getCanonicalUrl(route.path)` 組成，不讀 `window.location`。SSR 恆輸出平台 fallback；只在 `onMounted` 偵測 `navigator.share` 後切換為原生分享主鈕，避免 hydration mismatch。copy 成功顯示「已複製」2 秒，重複點擊會重設 timer；clipboard 缺席或拒絕時顯示可手動選取的 canonical URL。
- **掛載與樣式**：product／guide detail 都掛載分享區塊，置於主內容與 related products 間；LINE／Facebook／X／Threads 使用 `@iconify-json/simple-icons`，樣式沿用 detail 的 z-index 契約，避免被 transition shell 覆蓋。
- **測試結果**：`pnpm test` 89 files、620 tests passed；`pnpm lint`、`pnpm typecheck` passed；static generate 成功（548 routes）。實際 static preview 確認 product 與 guide 都 render fallback 四平台按鈕及 icon。Playwright browser integration 對生成網站注入 Web Share API，確認主鈕傳入 title＋canonical URL；另在無 Web Share、授權 clipboard 的 context 確認 copy 後「已複製」回饋與 clipboard canonical URL。
- **待部署驗收**：AC12 的 production host 值待 M5 將正式 `APP_URL=dwselect.applepig.net` 烤入 quality-gate generate 後驗證；本機 build 已確認分享連結使用 build-time `dwselect.toybox.local` canonical host，而非瀏覽當下的其他 host。

## Milestone 2.2: pill 折行修互擠（ADR-036-8）

- **技術決策**：
  - 擠壓根因是「縮小優先於折行」的 flex 設定（`.product-card-meta` 不折行、channel badge `flex: 0 1 auto; min-width: 0` 允許縮到 ellipsis）。修法：meta 列加 `flex-wrap: wrap`，兩 pill 合併宣告 `flex: 0 0 auto`（shrink 0 下 `min-width: 0` 已無語意故一併移除）；`.catalog-pill` 的 `max-width: 100%`＋ellipsis 保留當單 pill 超卡寬的最後防線。既有 `gap: 8px` 同時充當 row-gap，第二列 pill 在 `space-between` 下自然靠左，未另加規則（最小修改）。
  - **否決使用者原提議的 container query**：CQ 只回應容器寬度、偵測不到內容長度——同一卡寬下長短字樣需要不同行為，寬度閾值會提前折或漏折；flex-wrap 是內容感知的折行原語（ADR-036-8）。
  - E2E 折行契約（`related-products-layout.spec.ts` 新增 helper＋兩條 test，首頁卡與 related 卡 × 3 project）：短字樣同列 channel 在右（行為不變）；注入「Amazon JP」＋按容器實寬動態加長的價格（構造必折行、不依賴固定字樣與特定 content），斷言兩 pill 無截字（`scrollWidth ≤ clientWidth+1`）、channel 折到第二列、不超卡右緣。
- **問題與解法**：
  - Red 階段 helper 修過一次：舊 CSS 會壓縮 pill 使 bounding box 失真，「塞不下」判定改用 `scrollWidth`（內容真實寬），讓缺陷以斷言失敗而非探測異常呈現。
  - taxonomy 頁未寫獨立 E2E：與首頁同 grid＋同卡＋同 meta 規則、無獨立 CSS 路徑，首頁契約已代表。
- **測試結果**：`pnpm test` 608 passed（無涉、未紅）；`pnpm test:e2e tests/e2e/related-products-layout.spec.ts` 15 passed／12 skipped-by-project（含 AC6c 新契約 2 test × 3 project，TDD 對舊產物 6/6 紅後綠）；`compact-app.spec.ts` 受影響兩條 6 passed；lint exit 0；typecheck／knip 留 verify 鏈（純 CSS＋E2E diff）。截圖（scratchpad/m2.2/）人工檢視：手機橫式卡長字樣折兩列各自完整（回報情境實證）、桌面塞得下同列、短字樣不變。

## Milestone 2.1: related grid RWD 斷點與手機橫式卡（ADR-036-7）

- **技術決策**：
  - 使用者 iPad mini 實機驗收發現 744–767px 區間首頁（auto-fill 3 欄）與 related（固定欄數、768 起 3 欄）分岔。修法：`.related-products-grid` 3 欄門檻降至 744px，新立 `@media (min-width: 744px)` 集中宣告（欄數單一來源），原 768–1199 塊宣告移除、1200px 塊只留 `gap: 16px`；<744px 由 2 欄改單欄。
  - **手機橫式卡為 scoped CSS**：`@media (max-width: 743px)` 下規則全掛 `.related-products-grid` 之下——`.product-card-link` 兩欄 grid（縮圖 `--dw-related-thumb-size: 96px` 靠左、內容右）、summary 收 2 行、`.product-card-meta` 左緣以 calc 對齊內容欄。不加 variant props、不動元件 template，首頁／taxonomy 卡零影響（使用者拍板僅 related 適用）。
  - E2E：新增 AC5b（744／767 viewport 斷言 3 欄滿列 right-gap ≤1px，desktop project 內 setViewportSize 探測）與 AC6b（phone 單欄橫式：圖左文右、tile 寬<卡寬一半、不橫向溢出、四欄位可見）；「方圖寬＝卡內容寬」契約改僅 ≥744 適用。TDD 先紅（744 得 2 欄、phone 得直式，恰為根因行為）後綠。
- **問題與解法**：
  - 縮圖 96px 為版面取值（介於 resource-row 44px 與整寬之間，商品圖為內容重點取較大），spec 未定值；嫌大嫌小改 `--dw-related-thumb-size` 一行即調。
  - 上輪揭露的手機窄卡 channel pill「PChom…」截字，隨橫式版型自然消失。
  - 744–767px 無現成 Playwright device profile，以 setViewportSize 探測；iPad mini 實機最終觀感仍屬使用者人工驗收項。
- **測試結果**：`pnpm test` 608 passed（本次無涉、未紅）；`pnpm test:e2e tests/e2e/related-products-layout.spec.ts` 9 passed／12 skipped-by-project；`compact-app.spec.ts` 受影響兩條 6 passed；lint exit 0；typecheck／knip 留 verify 鏈（純 CSS＋E2E diff）。四檔 viewport 截圖（scratchpad/m2.1/）人工檢視通過：1280／768 不變、744 三欄與首頁一致、375 單欄橫式。

## Milestone 2: related 版面重做（含 rework：改重用 product-card，ADR-036-6）

- **技術決策**：
  - **Rework 緣起**：初版以純 CSS 把 `.related-product-card` 改直式、「版型語彙對齊」product-card；使用者檢視後裁定作廢——實質仍是第二套 card 樣式的變形，違反 Styling SSOT。終態：related 卡直接 render `product-card.vue` 原樣欄位（商品名＋summary＋price pill＋channel pill，不加 variant props），`related-products-section.vue` 退為薄容器（空列 guard＋標題＋grid），`.related-product-*` 卡片 CSS 全刪，card 視覺單一來源（AC6、AC8）。
  - `.related-products-grid` 由 `auto-fill minmax(150px,1fr)`（空欄軌根因）改固定欄數：base 2 欄、768px 起 3 欄——product 恆 3 筆恰好滿列（AC5）、1～2 筆卡寬不變（AC7）、guide curated 超列自然換行。此容器規則自初版保留。
  - **Payload**：`getRelatedProductCards` 與 `map-guide-detail` 換接首頁卡完整 mapper `mapProductCard`，`RelatedProductCardView` 瘦身型別退場（`related_products: ProductCardView[]`）；`mapProductCardBase` 失去外部使用者後併回 `mapProductCardFields`（保留會成 orphan export 觸發 knip gate）。payload 增量僅每 detail 頁 3 筆卡的 summary／price／tag 欄位（數百 bytes），不觸 028 痛點。
  - **破圖 fallback 移入 product-card**：`useBrokenImageFallback`＋onMounted 對 SSR 已載入即失敗圖的補偵測，自 section 移入 `product-card.vue`，首頁 grid 同步受惠；fallback icon 掛 `.product-image-fallback-icon`（`--dw-teal` token）。
  - 新 E2E spec `tests/e2e/related-products-layout.spec.ts`（compact-app.spec.ts 已 814 行故另立）：滿列 right-gap ≤1px、方圖寬=卡內容寬＋四欄位可見、稀疏／換行／窄屏契約，selector 指 related 區塊內 product-card。稀疏與超列情境現有內容無樣本（AC7 註記），以 evaluate 內 DOM 移除／clone 重現，不寫死卡片數。順帶修 `compact-app.spec.ts` 兩條既有測試的舊 `.related-*` selector（count／href、破圖 tile）。
- **問題與解法**：
  - **順帶修復正式站既有 paint 缺陷**：`.product-transition-shell`（absolute、z-index:0）壓過未抬升的內容 sibling，related 區塊文字整段不可見、只剩卡片圖浮出（佐證截圖 `debug-production-related.png`）。修法與 `.detail-content` 一致：`.related-products-section` 補 `position:relative; z-index:1`；契約說明寫在 shell 機制本身的註解。rework 後此修復仍必要——product-card 自帶 shell，related 區塊內每張卡都引入一個。deeper fix（shell `z-index:-1` 靠 root `isolation:isolate` 收容）經評估不做——VT morph 未實機驗收且 iOS 停用中，風險大於收益。
  - **全 E2E suite 2 條紅為既有 static-build 落差**（`compact-app.spec.ts` legacy category redirect ×2）：對 `NUXT_MODE=build` 靜態產物穩定紅、dev mode 綠，根因是 `app/pages/index.vue` onMounted redirect 於 SSG 不觸發；M2 diff 無涉，轉列 M5 前置議題（ADR-036-4 已預告 suite 從未打過 static 產物）。
  - **環境事件**：`./dev.sh exec` 以 root 跑過 build:content-images 使 `public/images` root-owned，容器降權 node EACCES crash loop；一次性 chown 修復。屬 devenv uid-mapping 待辦的新實例（`cmd_entrypoint` chown 清單不含 `public/`），已記入長期 memory。
  - **測試環境發現（非回歸）**：happy-dom 的 img 預設 `complete=true, naturalWidth=0`，與「已載入即失敗」同形——`tests/product-card-broken-image.test.ts` 的 NuxtImg stub 明確覆寫兩屬性區分「成功載入」與「SSR 破圖」；舊測試從未觸發此 quirk 是因斷言都在 nextTick 前。
  - **可見行為差異（已揭露、使用者拍板接受）**：手機固定 2 欄下卡寬約 160px，channel pill 文字依 `catalog-pill` 既有 ellipsis 截斷；欄位原樣是 ADR-036-6 的使用者決策。
- **simplify 審查（四角度）**：初版審查修二（E2E 冗餘 viewport 欄位收斂、shell 契約註解移到機制源頭）；rework 本身即 Reuse 角度的終極落實（平行 card 樣式歸零）。跳過並記錄：E2E 導航 helper 與 compact-app 跨檔重複＝第二次（第三次才抽象）、overflow 斷言兩處同理。
- **測試結果**：`pnpm test` 608 passed（含新檔 `product-card-broken-image.test.ts` 三條）；`pnpm test:e2e tests/e2e/related-products-layout.spec.ts` 8 passed／7 skipped-by-project、`compact-app.spec.ts` 受改兩條 6 passed；lint exit 0；`pnpm typecheck` exit 0（coordinator 補跑，developer 環境限制未跑）。三檔 viewport 截圖（scratchpad/m2-rework/）人工檢視通過：桌面 3 卡滿列、平板 3 欄、手機 2 欄換行，名稱／summary／price／channel 完整可見；guide 側無真實樣本（全站 `related_product_ids` 皆空），靠共用元件（AC8）涵蓋。

## Milestone 1: og image 修復

- **技術決策**：
  - `getOgImageUrl` 的本地 content 圖片分支由「一律回預設站圖」改為對映 `${SITE_URL}images/{domain}/{stem}.webp`（ADR-036-1）；URL 組裝沿用 `getCanonicalUrl`，不另造。
  - `pnpm build:content-images` 插入 `dev.sh cmd_generate_inner`，順序在 `assert-content-images` 之後——缺圖／壞圖由 assert 先以精確訊息中止。`cmd_generate_inner` 是本機 verify、Docker build mode、CI workflow 三條 generate 路徑的唯一收斂點，接一處全覆蓋。
  - simplify 審查後抽出 `app/utils/content-images/content-image-webp-name.ts`：「image_file → {stem}.webp」檔名規則的單一來源，`seo-metadata`（og URL）與 `scripts/build-content-images`（轉檔輸出）兩端共用，取代原本各寫一份、靠註解維繫等價的作法。純字串實作不用 `node:path`（app/utils 進 client bundle）；與 `parse(name).name` 等價的前提（IMAGE_FILE_PATTERN 禁斜線與前導點）註明於檔頭。
- **問題與解法**：
  - 舊測試斷言「content path → SITE_OG_IMAGE」是 028 時代的行為（SSG 未輸出 source path，故意打回預設圖）；036 spec 明文變更此行為，測試依新規格改寫，非弱化。
  - 邊界行為微調（主動揭露）：新 regex 要求 `images/` 後為單一路徑段；更深層路徑（如 `/products/images/sub/x.jpg`）舊版回預設圖、新版 fall through 到 `getCanonicalUrl`。此輸入在現有呼叫端不可能出現（`resolveImageFileUrl` 的 IMAGE_FILE_PATTERN 禁止斜線），不加保守 fallback。
- **simplify 審查（四角度）**：Reuse＋Altitude 指向同一根因（stem 規則雙份實作），已修如上。跳過並記錄：`build-content-images` 每次 generate 全量重轉無增量 cache（既有行為、非本次引入；修它需動 `resetOutputDirectory` 的 rm-rf 重置與孤兒清理，另開任務，量級數秒～十幾秒／次）；sharp encode 迴圈序列化（同上，加 cache 後影響縮小）；domain enum `(products|guides)` 三處重複（等第三個 domain 出現再抽，避免過早抽象）。
- **測試結果**：`pnpm test` 607 passed（含新增 helper 測試 7 條與 seo-metadata 改寫）；`./dev.sh exec ./dev.sh verify` 全鏈（test→lint→knip→typecheck→generate）綠。generate 產物全量對帳：88 個 detail 頁中 83 頁 og:image／twitter:image 指向自身 webp 且 `.output/public/images/` 檔案 100% 存在（77 product＋6 guide webp），5 頁 fallback 皆為無圖 guide。AC4（正式站 curl 抽測）待部署後人工驗收。
