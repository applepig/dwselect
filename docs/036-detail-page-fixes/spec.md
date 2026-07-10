# 036 Detail Page Fixes — detail 頁缺陷修繕與互動功能

## 目標

修復 product/guide detail 頁兩個正式站可見缺陷（og image 永遠是預設圖、related 區塊過小鬆散），並加入低後端成本的使用者互動（手刻 share buttons、Disqus 留言），同時補齊 035 遺留的 deploy pipeline 改善（preview E2E gate、artifact 提升）。

## 非目標

- 不新增會員系統、站內 like／reaction／收藏後端。
- 不導入 Facebook Like Button、Facebook Comments Plugin 或 Facebook SDK。
- 不導入第三方分享聚合服務（ShareThis／AddThis 類）。
- 不改 content schema；公開 runtime 不讀取 Git-backed content 以外的來源。
- 不做 og image 的社群尺寸裁切（1200×630 專用圖）——沿用 `build-content-images` 的 1200px `fit: inside` 產物，比例交由社群平台自裁。
- 不改 taxonomy／首頁／search 等 detail 以外頁面的版面。

## User Story

1. 作為分享者，我想要把 detail 頁貼到 LINE／FB／X／Threads 時預覽卡顯示該商品或指南自己的圖，以便對方一眼認出內容。
2. 作為瀏覽者，我想要在 detail 頁底部看到清楚、填滿版面的相關商品卡片，以便繼續探索。
3. 作為瀏覽者，我想要在 detail 頁一鍵分享目前頁面到常用平台或複製連結，以便推薦給朋友。
4. 作為瀏覽者，我想要在 detail 頁留言討論，以便交流使用心得。
5. 作為維護者，我想要 deploy 的產物就是 quality gate 驗過的那一份、且上線前先在 preview URL 跑過 E2E，以便壞版不會直達正式站。

### 驗收條件

#### M1 og image

- [x] AC1：給一個帶 `image_file` 的 published product，其 detail 頁 prerender HTML 的 `og:image`／`twitter:image` 為 `${SITE_URL}images/products/{name}.webp` 絕對 URL（非預設 `og-image.png`）；guide 帶 `image_file` 者同理指向 `images/guides/{name}.webp`。
- [x] AC2：`generate` 完成後，AC1 所指的每個 og image URL 在輸出目錄（`.output/public/images/...`）都有對應檔案存在——og 指到哪、檔案就在哪，不產 404。
- [x] AC3：給一個 `image_url` 為外部絕對 URL 的 guide，og:image 原樣使用該外部 URL；給一個無圖 guide，og:image 回退預設 `${SITE_URL}og-image.png`。（外部 URL passthrough 於單元測試層驗證；現有 published content 無外部 `image_url` 樣本，prerender 產物層無從抽驗）
- [ ] AC4：正式站部署後，抽測一個 product 與一個 guide detail 頁，og:image 指向自身圖片且該 URL 回 200 image content-type（人工／curl 驗收）。

#### M2 related 版面

- [x] AC5：桌面寬度（≥1024px）下 related 區塊的卡片鋪滿整列可用寬度，卡片右側不留空欄軌（現況 5 欄軌只填 3 卡、右留白 358px 的行為消失）；窄螢幕依寬度降欄不橫向溢出。空欄軌回歸需有自動守門：Playwright 對 related 區塊斷言 first-row right gap ≤ 1px（沿 `tests/e2e/compact-app.spec.ts` product-grid 的既有寫法），不得只靠人工截圖。
- [x] AC6：related 卡片直接重用 `product-card.vue`（圖上文下直式、方形縮圖，非另刻版型），顯示欄位與首頁卡一致：商品名、summary、price pill、channel pill（不再另示 category meta）；related 區塊既有破圖 fallback 行為（`useBrokenImageFallback`，含 SSR 已載入即失敗圖的補偵測）不回歸。驗收方式：unit 行為測試＋E2E 截圖＋人工檢視（桌面／平板／手機三檔 viewport）。
- [x] AC7：related 為 0 筆時區塊不 render（既有行為不回歸）；1～2 筆時卡片維持與 3 筆時相同的單卡寬度，不放大爆版。注意：1～2 筆情境現有內容**無樣本**（product 側經 `RELATED_PRODUCT_LIMIT=3` 恆為 3 筆；全站 guide 的 `related_product_ids` 目前皆為空陣列），驗收以測試 fixture 或臨時 content 樣本重現，不得因找無頁面而跳過。guide curated 筆數不設上限：超過一列時 grid 自然換行多列、不橫向溢出、不裁切。
- [x] AC8：product 頁「You may also like」與 guide 頁「相關商品」同步套用新版型（共用元件單一來源，不許兩頁分岔）。

> M2 初版（純 CSS 對齊 product-card 版型）經使用者檢視後作廢改重做：卡片改直接重用 `product-card.vue` 元件本身（見 ADR-036-6），AC5–AC8 取消勾選待重驗。
> M2 rework 驗收後使用者實機（iPad）回饋追加 RWD 調整（AC5b／AC6b，見 ADR-036-7）：

- [x] AC5b：related grid 斷點對齊 iPad mini——viewport ≥744px 時 3 欄（消除現況 744–767px 區間「首頁 auto-fill 3 欄、related 固定 2 欄」的不一致），<744px 時單欄；原 2 欄檔位取消。E2E 於 744px 與 767px viewport 斷言 3 欄滿列（right-gap ≤ 1px 契約沿用）。
- [x] AC6c：product 卡 meta 列的 price pill 與 channel pill 內容過長時（如 Amazon JP＋TWD 長價格）不互擠截字——兩 pill 同列塞不下時 channel pill 折行到第二列，各自完整顯示；塞得下時維持同列左右分佈。適用所有 product 卡出現處（首頁／taxonomy／related，共用元件掃同類）；單一 pill 自身超過卡寬的極端情況保留 ellipsis 防線。E2E 以 DOM 注入長字樣驗證折行契約，不依賴特定 content 樣本。
- [x] AC6b：<744px 時 related 卡改橫式版型：方形縮圖靠左、名稱／summary／price／channel pill 靠右（視覺密度參照 link 卡列表）；顯示欄位不變。僅 related 區塊適用——首頁與 taxonomy 頁的 product 卡版型不動（使用者拍板範圍）。實作為 scoped CSS（`.related-products-grid` 之下的 media query），不加 variant props；AC6 的「方圖寬＝卡內容寬」E2E 契約改為僅 ≥744px 適用，<744px 另立橫式契約（圖在左、文在右、單欄不溢出）。

#### M3 share buttons

- [ ] AC9：detail 頁（product 與 guide）render 分享區塊；在支援 `navigator.share` 的環境點擊主分享鈕會以 canonical URL（`getCanonicalUrl` 結果，非 `window.location`）與頁面標題呼叫 Web Share API。
- [ ] AC10：在不支援 `navigator.share` 的環境，分享區塊顯示 LINE、Facebook、X、Threads 四個平台鈕與 copy link 鈕；各平台鈕 href 為該平台 share intent URL 且帶 URL-encoded canonical URL。
- [ ] AC11：點擊 copy link 後剪貼簿內容為 canonical URL，且按鈕出現短暫的「已複製」回饋（約 2 秒後復原）；clipboard API 不可用時顯示可手動選取的 URL 作為 fallback。
- [ ] AC12：分享 URL 一律為 build 時烤入的 canonical host（正式站 build 即 `dwselect.applepig.net`），不受瀏覽當下 host 影響。

#### M4 Disqus

- [ ] AC13：Disqus shortname 已設定的 build，product 與 guide detail 頁在留言區塊捲入 viewport 後才載入 Disqus embed script（lazy load，不隨頁面初載）；載入後留言區可見。
- [ ] AC14：thread identifier 為 content 型別＋id（如 `products/2026-06-02-adata-power-bank`），與頁面標題、URL 顯示文字無關——改標題不會產生新 thread。`page.url` 設為 canonical URL。
- [ ] AC14b：同一瀏覽 session 以 client-side navigation（如點 related 卡的 `NuxtLink`）從 detail A 切到 detail B 並捲至留言區時，Disqus 以 B 的 identifier 與 canonical URL 重新載入（`window.DISQUS` 已存在時走 `DISQUS.reset({ reload: true })`，不重複注入 script），不殘留 A 的 thread。
- [ ] AC15：shortname 未設定的 build（dev 預設），留言區塊整段不 render、不載入任何 Disqus script。
- [ ] AC16：Disqus script 載入失敗（斷網／adblock）時，detail 頁主內容 render 與互動不受影響，留言區顯示靜態提示文字而非破版（實作需同時註冊 script 的 `onerror`，不得只處理 `onload` 而卡在永久 loading）。
- [ ] AC16b：正式站部署後，人工開一個 detail 頁捲至留言區，確認 Disqus 留言區實際載入（lazy 注入故不可用 curl 靜態 HTML 驗）——此為 build-time env 注入點的正向驗收，防 shortname 未烤入造成整段靜默不 render（見 ADR-036-2 與 ADR-036-4 的耦合）。

#### M5 deploy pipeline

- [ ] AC17：quality gate workflow 將 generate 產物以 workflow artifact 上傳；deploy workflow 下載該 artifact 部署，全程不再執行第二次 `generate`（上線的與驗過的是同一份位元）。deploy log 需可見 artifact 來源 run id（`github.event.workflow_run.id`），且 deploy workflow 中不存在任何 `pnpm generate` step。
- [ ] AC18：deploy workflow 先以非 production branch 部署取得 Cloudflare Pages preview URL，對 preview URL 跑 Playwright E2E；E2E 失敗則 job 失敗且不執行 production 部署。
- [ ] AC19：E2E 通過後，同一份 artifact 以 `--branch=master` 部署為 production。
- [ ] AC20：E2E 對 preview URL 執行時不驗 canonical／og host（產物烤的是正式站 host，preview host 不同屬預期）。

## 相關檔案

- `app/utils/seo-metadata.ts` — `getOgImageUrl` 的 fallback regex（`:37-38`）是 M1 根因所在
- `scripts/build-content-images.ts` — 既有 sharp 最佳化輸出 `public/images/{products,guides}/{name}.webp`，M1 只差接線
- `dev.sh` `cmd_generate_inner()`（`:159-163`）— pre-generate chain，M1 接線點
- `app/components/related-products-section.vue` — M2 元件（035 收斂後單一來源）；rework 後退為薄容器（標題＋grid），卡片重用 `product-card.vue`
- `app/components/product-card.vue` — M2 rework 卡片單一來源；破圖 fallback 移入此處
- `scripts/public-payload/map-related-product-card.ts`、`map-product-card.ts` — M2 rework：related payload 改產完整 `ProductCardView`（與首頁卡同 mapper）
- `app/assets/styles/catalog.css` `.related-*`（`:860-958`、`:1419-1421`）— M2 版面根因（`auto-fill minmax(150px)` ＋ 64px 橫式卡）；rework 後 `.related-product-*` 卡片規則刪除、grid 容器規則保留
- `app/components/product-detail.vue`、`app/components/guide-detail.vue` — M3／M4 區塊掛載點
- `.github/workflows/static-generate.yml`、`.github/workflows/deploy.yml` — M5 就地改
- `playwright.config.ts`、`tests/e2e/compact-app.spec.ts` — M5 E2E 重用（`APP_URL` 注入 preview host）

## 既有資產盤點 / Reuse Map

| 既有資產 | 位置 | 本次如何沿用 |
|---|---|---|
| `build-content-images.ts`（sharp→webp 最佳化、collision／missing 防呆） | `scripts/build-content-images.ts` | M1 核心機制**已存在**，接進 `cmd_generate_inner` chain；不新造 copy script |
| `getCanonicalUrl`／`SITE_URL`／`SITE_OG_IMAGE` | `app/utils/seo-metadata.ts` | M1 og URL 組裝、M3 分享 URL 單一來源 |
| `buildSeoMeta` | `app/utils/seo-metadata.ts` | og/twitter 鋪版不動，M1 只改 `getOgImageUrl` 的輸出 |
| `resolveImageFileUrl` 的檔名規則（`IMAGE_FILE_PATTERN`） | `app/utils/content-images/resolve-image-file-url.ts` | M1 對映 `/products/images/x.jpg` → `images/products/x.webp` 時同步其副檔名→`.webp` 轉換規則（與 build-content-images `parse(name).webp` 一致） |
| `related-products-section.vue`＋`useBrokenImageFallback` | `app/components/`、`app/composables/` | M2 rework：section 退為薄容器；破圖 fallback 移入 product-card（首頁 grid 同步受惠） |
| `.related-*` class 與 `--dw-*` token | `app/assets/styles/catalog.css` | M2 rework：grid 容器規則保留（固定 2／3 欄）；`.related-product-*` 卡片規則刪除 |
| `product-card.vue` 元件本身 | `app/components/product-card.vue`＋`catalog.css` | M2 rework：related 卡直接 render 此元件（欄位原樣），card 視覺單一來源（ADR-036-6） |
| `mapProductCard`（首頁卡完整 mapper） | `scripts/public-payload/map-product-card.ts` | M2 rework：related payload 換接同一 mapper，`RelatedProductCardView` 瘦身型別退場 |
| Vite define 烤入 pattern（`__DW_SITE_URL__`，035 M3） | `nuxt.config.ts`／`vitest.config.ts` | M4 Disqus shortname 沿同一 pattern 烤入 |
| `useSeoMeta` head-before-await 不變式 | `app/pages/products/[id].vue`、`guide/[id].vue` | M3/M4 新區塊為 body 元件，不動 head 註冊時機 |
| quality gate workflow 的 generate step | `.github/workflows/static-generate.yml` | M5 在其後加 artifact upload，不另開第三支 workflow |
| Playwright config（`APP_URL` 驅動 baseURL、`reuseExistingServer`） | `playwright.config.ts` | M5 CI 以 job env 注入 preview host 直接重用；preview URL 已在線故不觸發 webServer 啟動 |
| `dev.sh verify` 容器內 CI 等價 gate | `dev.sh` | 各 milestone 完成後推 PR 前照常執行 |

新建項目：

- `app/components/share-buttons.vue`（M3）— 既有元件無分享語彙，確需新造；樣式吃 `catalog.css` token。
- `app/components/disqus-thread.vue`（M4）— 第三方 script 隔離元件，plan.md 明定需隔離，確需新造。
- 品牌 icon 資產（LINE／FB／X／Threads）— 專案現只有 Nuxt UI 內建 lucide（無品牌 icon）；新增 `@iconify-json/simple-icons` dev dependency 或元件內手刻 inline SVG，實作時擇一（見 ADR-5）。
- 已搜尋確認無既有可複用：share／social／comment 相關元件（`rg -i 'share|disqus|comment' app/` 無 UI 資產）、GitHub Actions artifact 傳遞（兩支 workflow 現以重 generate 傳遞，無 artifact upload/download 既有寫法）。

## 介面/資料結構 (API / Data Structure)

本 sprint 無新增後端 API。外部介面如下：

**M3 分享 intent URL（GET link，`{url}`＝URL-encoded canonical URL、`{text}`＝頁面標題）：**

```
LINE:     https://social-plugins.line.me/lineit/share?url={url}
Facebook: https://www.facebook.com/sharer/sharer.php?u={url}
X:        https://twitter.com/intent/tweet?url={url}&text={text}
Threads:  https://www.threads.net/intent/post?text={text}%20{url}
```

**M4 Disqus embed 設定（client-only，於元件內組）：**

```js
window.disqus_config = function () {
  this.page.url = 'https://dwselect.applepig.net/products/{id}/'  // canonical
  this.page.identifier = 'products/{id}'                           // 型別+content id，與標題無關
}
// script src = https://{shortname}.disqus.com/embed.js，IntersectionObserver 進 viewport 才注入
```

**M5 workflow 間 artifact 契約：**

```
static-generate.yml:  actions/upload-artifact    name=static-site  path=.output/public
                      ※ build-time env（APP_URL、DISQUS_SHORTNAME）注入點＝本 workflow job env——
                        M5 後 generate 只發生在這裡，Vite define 只在此烤入（加在 deploy.yml 不會生效）
deploy.yml:           permissions 需含 actions: read（跨 run 下載 artifact 的必要權限）
                      actions/download-artifact@v4  name=static-site
                        run-id: github.event.workflow_run.id ＋ github-token 兩者必填（缺一即在自己的 run 找不到 artifact）
                      → wrangler pages deploy（branch=preview-{sha}）→ 取 preview URL
                      → playwright install --with-deps chromium（CI runner 無預裝 browser）
                      → APP_URL={preview-host} pnpm test:e2e
                        ※ APP_URL 為 host-only：剝除 wrangler 輸出 URL 的 https:// 前綴與尾斜線
                          （playwright.config baseURL=`https://${APP_URL}` 拼接）
                        ※ 對 preview 執行時停用／繞過 playwright.config 的 webServer（純 baseURL＋readiness 等待），
                          避免 preview 短暫不可達時 fallback 誤啟 `pnpm dev` 的 Docker 路徑
                      → wrangler pages deploy（branch=master）
```

## 邊界案例

- **Case 1（M1）**：guide 無 `image_file` 也無 `image_url` → og:image 回退預設站圖（AC3）；`image_url` 為外部絕對 URL → 原樣 passthrough，不經 canonical 重組。
- **Case 2（M1）**：`image_file` 副檔名為 `.png`／`.jpeg` → og URL 一律 `.webp`（build-content-images 統一轉檔），對映規則跟檔名 stem 走。
- **Case 3（M2）**：related 僅 1 筆 → 單卡維持標準卡寬靠左，不拉伸成全寬巨卡（AC7）。
- **Case 4（M3）**：非 secure context 或 clipboard 權限被拒 → copy link 顯示可選取的 URL 文字 fallback，不靜默失敗（AC11）。
- **Case 5（M4）**：adblock 擋掉 embed.js → 留言區顯示靜態提示，主內容零影響（AC16）；SSG prerender 階段不執行任何 Disqus code（client-only）。
- **Case 6（M4）**：同一 content id 的 product 與 guide 不互撞——identifier 帶型別前綴（AC14）。
- **Case 6b（M4）**：client-side navigation 從 detail A 切到 detail B——Disqus 為全域 script，需以 `DISQUS.reset` 換 thread，不得殘留 A 的留言（AC14b）。
- **Case 7（M5）**：E2E 在 preview 上失敗 → production 不部署，正式站維持前一版（AC18）；preview host 與烤入 canonical host 不同屬預期，E2E 不斷言 host（AC20）。
- **Case 8（M5）**：workflow artifact 預設保留期內重跑 deploy → 仍部署同一份 artifact，不重 generate。

## ADR（Architecture Decision Record）

### ADR-036-1：og image 來源＝接線既有 `build-content-images` 產物

- 決策：把 `build:content-images` 接進 `dev.sh cmd_generate_inner` 的 pre-generate chain，`getOgImageUrl` 把本地 `/{domain}/images/{file}` 對映為 `${SITE_URL}images/{domain}/{stem}.webp`。
- 原因：機制已完整存在（sharp 最佳化、1200px、collision／missing 硬失敗防呆），正式站 404 只因沒接進 generate 流程；接線是最小正確修改。
- 替代方案：IPX 絕對 URL（拒：`/_ipx/...` 路徑是 Nuxt Image 內部序列化格式，og 標籤耦合它會隨升級斷鏈）；raw copy 原圖進 public（拒：等於在既有最佳化機制旁再造第二套 copy，違反 SSOT）。

### ADR-036-2：Disqus shortname 以 build 時 env 烤入，未設定即整段不 render

- 決策：沿 035 M3 的 Vite define pattern（如 `__DW_DISQUS_SHORTNAME__` ← `DISQUS_SHORTNAME` env，optional），空值→留言元件不 render。dev 不設此 env 即天然不載入；production 注入點**明定為 gate workflow `static-generate.yml` 的 job env**——依 ADR-036-4，M5 後 generate 只發生在 gate、deploy 只搬 artifact，把 env 加在 deploy.yml 完全不會生效，且因「空值即不 render」的設計，錯位會以 production 留言區靜默消失呈現、本機測試照樣綠——故以 AC16b 的 production 正向驗收把關。
- 原因：與 `SITE_URL` 同一配置語彙；「dev 不載入」用 env 缺席表達，行為顯式、不靠 host sniffing。
- 替代方案：`runtimeConfig.public`（拒：035 已因 `NUXT_PUBLIC_*` 可被單邊覆寫而棄用此 pattern）；依 host 判斷（拒：隱晦且測不動）。

### ADR-036-3：分享＝Web Share API first、平台 intent URL fallback、零 SDK

- 決策：主鈕走 `navigator.share`；不支援時顯示四平台 intent link＋copy link。全程無第三方 script。
- 原因：plan.md 已確認方向；intent URL 是各平台公開穩定介面，無隱私／效能代價。
- 替代方案：第三方分享聚合（plan.md 已列非目標）；只做 copy link（拒：桌面分享體驗過弱，使用者已選含四平台）。

### ADR-036-4：deploy 改為 artifact 提升＋preview E2E gate

- 決策：gate workflow 上傳 `.output/public` artifact；deploy workflow 下載同一份，先 preview branch 部署→對 preview URL 跑 E2E→通過才 `--branch=master` 上 production。
- 原因：現況 deploy 重新 generate，「驗過的」與「上線的」不是同一份位元（cache／依賴飄移即分岔）；且無任何 E2E 攔在正式站前。此為 035 spec 明文遺留項。
- 附帶慣例變更：此決策使 E2E **首次進入 CI**。CLAUDE.md「E2E 必須在 host 跑」係因本機 Alpine（musl）容器跑不了 Playwright 的 glibc Chromium；CI runner（ubuntu-latest，glibc）不受此限，但需在 deploy workflow 自行 `playwright install --with-deps chromium`。既有 E2E suite 至今只打過 dev server、從未對 static 產物執行（IPX 端點、`_payload.json` 供應方式不同），故 M5 開工前置：先在本機對 `pnpm generate` 產物跑既有 suite 確認綠燈，再接 preview。
- 附帶決策：deploy workflow permissions 補 `actions: read`（跨 run 下載 artifact 必要）；build-time env 注入點隨 generate 移至 gate workflow（見 ADR-036-2）。
- 替代方案：維持重 generate＋事後 E2E（拒：驗證與產物脫鉤的缺陷不變）；Cloudflare 原生 Git 整合 preview（拒：脫離現有 wrangler-action 流程，且無法保證 artifact 同一份）。

### ADR-036-5：品牌 icon 用 `@iconify-json/simple-icons`，鎖版本呈現

- 決策：新增 `@iconify-json/simple-icons` dev dependency，share 按鈕以 `UIcon name="i-simple-icons-*"` 取用。
- 原因：與 Nuxt UI 既有 iconify 機制同軌，零 runtime 成本（build 時內聯）；手刻 SVG 要自維護品牌圖形更新。
- 替代方案：手刻 inline SVG（備援：若 simple-icons 缺 LINE 等特定品牌圖或授權疑慮，實作時改走此路並於 works.md 記錄）。

### ADR-036-6：related 卡直接重用 `product-card.vue`（M2 rework）

- 決策：`related-products-section.vue` 退為薄容器（標題＋grid＋空列不 render），卡片改 render 既有 `product-card.vue`，顯示欄位原樣（商品名＋summary＋price pill＋channel pill）；related payload 改用首頁卡同一 mapper（`mapProductCard`）產出完整 `ProductCardView`，`RelatedProductCardView` 瘦身型別退場；`catalog.css` 的 `.related-product-*` 卡片規則刪除，`.related-products-grid` 固定欄數容器規則保留。破圖 fallback（`useBrokenImageFallback`）移入 product-card，首頁 grid 同步受惠。
- 原因：M2 初版以 `.related-*` CSS「版型語彙對齊」product-card，實質仍是第二套 card 樣式的變形，會持續漂移，違反 Styling SSOT；直接重用元件讓 card 視覺只有一份程式碼。payload 增量僅每 detail 頁 3 筆卡的 summary／price／tag 欄位（約數百 bytes），不觸 028 拆 payload 的痛點。
- 替代方案：product-card 加 variant props 隱藏 summary／price、改顯示 category meta（拒：多模式元件增條件複雜度，使用者已拍板原樣欄位）；維持 M2 初版獨立 `.related-*` CSS（拒：平行樣式系統，本 ADR 的根因）。

### ADR-036-7：related grid 斷點對齊 iPad mini，手機橫式卡以 scoped CSS 實作（M2.1）

- 決策：related grid 的 3 欄門檻由 768px 降至 744px（iPad mini 直向 viewport），<744px 由 2 欄改單欄；單欄時 related 內的 product-card 以 scoped CSS（`.related-products-grid` 之下的 media query）切換橫式版型（方圖左、內容右），不加 variant props、不動元件 template。適用範圍僅 related 區塊，首頁／taxonomy 的 product 卡不動（使用者拍板）。
- 原因：使用者 iPad mini 實機驗收發現首頁（auto-fill，744px 塞得下 3×220px）與 related（固定欄數、768px 起 3 欄）在 744–767px 區間分岔；手機窄卡直式資訊密度低且 pill 截字，橫式單欄較合閱讀（視覺參照既有 link 卡列表）。scoped CSS 讓元件維持單一來源，版型純屬容器上下文的 responsive 行為，與 ADR-036-6「不加 variant props」一致。
- 替代方案：variant props（拒：ADR-036-6 已拒，且此為純版面關切，CSS 可完整表達）；全站手機卡都改橫式（拒：使用者拍板僅 related，首頁觀感改動過大）；斷點沿用 768（拒：744px 的 iPad mini 直向正是回報裝置，會留在 2 欄檔）。

### ADR-036-8：pill 互擠以 flex-wrap 折行解，不用 container query（M2.2）

- 決策：`.product-card-meta` 加 `flex-wrap: wrap`，兩 pill 改 `flex-shrink: 0`（取消 channel badge 的 `flex: 0 1 auto; min-width: 0` 縮小行為）；pill 既有 `max-width: 100%`＋ellipsis 保留，作為單一 pill 自身超過卡寬時的最後防線。
- 原因：擠壓根因是「縮小優先於折行」的 flex 設定。使用者提議 container query 偵測折行，但 CQ 只回應容器寬度、偵測不到內容長度——同一卡寬下長短字樣需要不同行為，寬度閾值無法表達；flex-wrap 是內容感知的折行原語，恰在塞不下時觸發，無需猜閾值。
- 替代方案：container query 寬度閾值切直排（拒：如上，內容長度不可偵測，會提前折或漏折）；縮 pill 字級（拒：治標且傷可讀性）。

## Milestones

### Milestone 1: og image 修復

> 範圍：`app/utils/seo-metadata.ts`、`dev.sh`（generate chain 一行）、`tests/` 對應測試
> 驗證：`pnpm test`（getOgImageUrl 對映／fallback／passthrough 行為測試）；`./dev.sh exec ./dev.sh verify`；generate 後檢查 `.output/public/images/` 與 prerender HTML og 標籤
> 預期結果：帶圖 content 的 detail 頁 og:image 指向自身 webp 且檔案存在；無圖／外部 URL 走 AC3 fallback

- [x] Red → Green → Refactor

### Milestone 2: related 版面重做（rework：改重用 product-card，初版純 CSS 版型作廢，見 ADR-036-6）

> 範圍：`app/components/related-products-section.vue`（退為薄容器，卡片 render `product-card.vue`）、`app/components/product-card.vue`（破圖 fallback 移入）、`scripts/public-payload/map-related-product-card.ts`（換接 `mapProductCard`）、`app/utils/public-content-view-types.ts`（`RelatedProductCardView` 退場，`related_products` 改 `ProductCardView[]`）、`app/assets/styles/catalog.css`（刪 `.related-product-*` 卡片規則、grid 容器規則保留）、`tests/` 對應改寫（unit＋`tests/e2e/related-products-layout.spec.ts` selector 改指 product-card）
> 驗證：`pnpm test`（related-products-section 行為測試改寫後不紅、payload mapper 測試同步）；Playwright related 區塊 right-gap ≤ 1px 自動斷言（AC5）；AC7 稀疏（1～2 筆）情境以測試 fixture 重現（現有內容無樣本，見 AC7 註記）；三檔 viewport 截圖人工驗收（AC5–AC7）；product 與 guide 兩頁皆看
> 預期結果：related 卡與首頁卡同一元件、同一欄位，1～3 筆皆不爆版，兩 detail 頁同步生效
> 實作注意：M2 初版的 `.related-products-section` paint 修復（`position:relative; z-index:1`，壓制 `.product-transition-shell` 疊層缺陷）需保留——product-card 自帶 shell，related 區塊內每張卡都會再引入一個 shell，疊層契約以初版註解為準

- [x] Red → Green → Refactor（rework）

### Milestone 2.1: related grid RWD 斷點與手機橫式卡（使用者 iPad 實機驗收回饋，見 ADR-036-7）

> 範圍：`app/assets/styles/catalog.css`（related grid 斷點 768→744、<744 單欄＋scoped 橫式卡規則）、`tests/e2e/related-products-layout.spec.ts` 斷言更新；**不動**元件 template、payload、首頁／taxonomy grid
> 驗證：`pnpm test`（應無涉、不許紅）；E2E——744px／767px 斷言 3 欄滿列 right-gap ≤1px（AC5b）、<744px 斷言單欄橫式（圖左文右、不橫向溢出，AC6b）、方圖寬＝卡內容寬契約改僅 ≥744px 適用；四檔 viewport 截圖（1280／768／744／375）人工驗收
> 預期結果：iPad mini 直向 related 3 欄與首頁一致；手機 related 單欄橫式卡，欄位不變

- [x] Red → Green → Refactor

### Milestone 2.2: pill 折行（使用者實機驗收回饋，見 ADR-036-8）

> 範圍：`app/assets/styles/catalog.css`（`.product-card-meta` wrap＋pill flex-shrink 調整）、`tests/e2e/` 折行契約斷言；不動元件 template
> 驗證：`pnpm test`（應無涉、不許紅）；E2E——DOM 注入長字樣（Amazon JP／TWD 長價格級別）斷言兩 pill 各自無截字、塞不下時折兩列、塞得下時同列；首頁與 related（含 <744 橫式）兩種卡上下文都驗；截圖人工驗收
> 預期結果：長字樣 pill 折行完整顯示，短字樣行為不變，全站 product 卡同步生效

- [x] Red → Green → Refactor

### Milestone 3: share buttons

> 範圍：新增 `app/components/share-buttons.vue`、掛進 `product-detail.vue`／`guide-detail.vue`、`catalog.css` 樣式、`@iconify-json/simple-icons` 依賴、`tests/` 元件行為測試
> 驗證：`pnpm test`（Web Share 呼叫參數、fallback 分支、intent URL 組裝、copy 回饋）；實機／模擬器點一輪 Web Share 與 copy link
> 預期結果：AC9–AC12 全數可觀測通過
> 實作注意：detail 頁為 prerender，`navigator.share` 偵測不得直接影響 SSR 輸出結構（於 `onMounted` 後切換或 `<ClientOnly>`，避免 hydration mismatch）；`navigator.share()` 需 catch 並忽略 `AbortError`（使用者取消分享面板非錯誤）；copy 回饋計時器重複點擊時先 `clearTimeout` 舊計時器再重啟

- [ ] Red → Green → Refactor

### Milestone 4: Disqus 留言

> 範圍：新增 `app/components/disqus-thread.vue`、掛進兩 detail 頁、`nuxt.config.ts`／`vitest.config.ts` define 注入、`tests/` 行為測試
> 驗證：`pnpm test`（shortname 缺席不 render、identifier 組裝、lazy 觸發、**identifier 變更觸發 `DISQUS.reset` 的 re-entrancy 行為**——以 fake `window.DISQUS.reset` stub 驗證，不只測首次 script injection）；設測試 shortname 的本機 build 人工驗證載入、SPA 切頁 thread 切換與失敗 fallback（暫時斷網／block embed.js）
> 預期結果：AC13–AC16b 全數通過（AC16b 於 M5 上線後的 production 部署驗收）；dev 預設完全無 Disqus 蹤跡
> 實作注意：production 的 `DISQUS_SHORTNAME` 加在 `static-generate.yml` job env（不是 deploy.yml，見 ADR-036-2）；動態注入的 script 需同時掛 `onload` 與 `onerror`

- [ ] Red → Green → Refactor

### Milestone 5: deploy pipeline（🔀 與 M1–M4 平行，獨立工作線）

> 範圍：`.github/workflows/static-generate.yml`（artifact upload＋build-time env 注入點）、`.github/workflows/deploy.yml`（permissions `actions: read`、artifact download、playwright install、preview E2E、兩段部署）；必要時允許 preview 專用的 Playwright config／env 開關（停用 webServer），除此之外不動應用程式碼
> 前置：先在本機對 `pnpm generate` 產物跑既有 E2E suite 確認綠燈（suite 從未打過 static 產物，見 ADR-036-4），再接 preview
> 驗證：PR 觸發 gate 確認 artifact 上傳；merge 後觀察 deploy run——artifact download（log 可見來源 run id）→preview 部署→E2E→production 三段依序；刻意觀察一次 E2E 失敗路徑（或以 dry-run 分支演練）確認 production 不部署
> 預期結果：AC17–AC20 通過；deploy log 可見同一 artifact 兩段部署、無第二次 generate

- [ ] Red → Green → Refactor

## Open Questions

（皆已解決）

- ~~Disqus shortname~~ 已註冊確定：**`dwselect`**（embed script 即 `https://dwselect.disqus.com/embed.js`）。production 由 **gate workflow `static-generate.yml`** 的 job env 提供 `DISQUS_SHORTNAME=dwselect`（M5 後 generate 只在 gate 發生，加在 deploy.yml 不會生效，見 ADR-036-2）；記得在 Disqus Settings → Advanced 的 Trusted Domains 加入 `dwselect.applepig.net`。
- ~~M5 preview URL 認證問題~~ 已實測解決：CF Pages 專案 `dwselect`（direct upload、無 Git 綁定）的 per-deployment URL（`{id}.dwselect.pages.dev`）無 Access 保護、匿名 curl 200 可直連，E2E 可直接打 preview URL，無需豁免機制。
