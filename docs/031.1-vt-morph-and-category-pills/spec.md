# 031.1 View Transition morph 修復 + 分類頁 chip bar 持久化

> 子 sprint，延伸自 031（taxonomy 導航單一真相）。承接 031 M3 的 View Transition spike 與
> 「分類導航改導去 `/category/{id}` 獨立頁」兩項改動所暴露的後續問題。續用
> `feat/031-taxonomy-nav-single-source` 分支（與 031 M3 spike commit 緊耦合，不另開分支）。

## 目標

修復 031 spike/路由改動暴露的兩個獨立問題：

- **A. 轉場修復**：消除 Vue `pageTransition` 與 View Transition API 兩套換頁動畫互打，讓「卡片圖 → 詳情 hero」的 morph（圖片留位放大）真正發生。
- **B. 分類導航持久化**：iPad/手機從首頁進 `/category/{id}` 後，分類 chip bar 不再消失——抽共用元件讓首頁與分類頁共享同一條 pill bar，active 隨路由切換，恢復「像切 tab」的體驗。

## 非目標

- **不做 iPad Safari hydration 的最終裁決**：A 仍受 031 AC10 的 gate 管（VT 是否能 ship 由使用者實機 iPad Safari 驗證決定）。本 sprint 只負責「當 VT 開啟時，轉場行為正確」，不改變 gate 結論，也不移除 revert 退路。
- **不擴及 tag/brand/channel 頁的 chip bar**：B 只處理 `/category/{id}`。其餘 taxonomy 種類的同類導航另議（屬 032 A4 表驅動範圍）。
- **不做 cross-document（MPA）View Transition**：維持 same-document SPA 轉場。
- **不順手重構** taxonomy 頁四檔複製（032 A1）、`'all'` sentinel 收斂（032 B1）等 code health 項。

## User Story

### A. 轉場 morph
作為瀏覽商品的使用者，我從首頁點商品卡片進詳情頁時，看到卡片圖片平滑放大「留在原地」過渡到詳情頁大圖，而不是兩層動畫互相干擾、或圖片直接消失重畫。

### B. 分類 chip bar 持久化
作為用 iPad／手機的使用者，我在首頁點某個分類 chip 進到該分類頁後，分類 chip bar 仍在、且當前分類呈 active，我可以直接再點別的分類切換，體驗跟原本在首頁切換分類一致。

### 驗收條件

**A. 轉場修復**
- [x] AC1：新增全域 middleware，當瀏覽器支援且本次導航會交給 View Transition 接手時，將該次 `to.meta.pageTransition` 與 `to.meta.layoutTransition` 設為 `false`，使同一次換頁只有一套動畫系統作用。
- [x] AC2：middleware 與 `experimental.viewTransition` flag 綁定進退——`viewTransition: false`（gate FAIL／revert）時，middleware 不得關閉 Vue transition（否則變成完全無動畫）。綁定 SSOT 為 `appConfig.enableViewTransition`（由同一個 module-level 常數同時餵給 `experimental.viewTransition` 與 `appConfig`），client middleware 只能讀 `useAppConfig().enableViewTransition`，不得 import `nuxt.config.ts`。**改用 `appConfig` 而非 `runtimeConfig.public` 的理由（031.1 xreview 發現）**：`runtimeConfig.public.*` 會被 `NUXT_PUBLIC_*` env 於 build/generate 時覆寫，但 `experimental.viewTransition` 是 build-time only、永不吃 env——兩者 override 機制不對稱，設 `NUXT_PUBLIC_ENABLE_VIEW_TRANSITION=false` 會讓 middleware 停關 Vue transition 而 VT 仍接手，雙動畫互打復活、revert 半套且無測試報錯。`appConfig` 為 build-time 烤入、非 env-overridable，與 `experimental` 真正同源不可分歧。
- [~] AC3（契約已驗、morph 視覺 gate 到 AC10 使用者實機）：VT 開啟下，從首頁卡片導航至 `/products/{id}`，被點卡片的 `product-image-{id}` 在 old／new 兩個快照都存在 → 形成 morph（不再因 `out-in` 延後掛載而落空）。以可重現方式驗證 transition 契約：middleware 關閉 Vue `out-in` 後，點擊卡片進詳情時新頁 `.detail-hero-tile`／圖片在 VT update callback 完成前已 render，且與來源圖片共享同一個 `view-transition-name`。
- [x] AC4：`prefers-reduced-motion: reduce` 下，morph／root／Vue transition 全數停用，無殘留動畫（沿用 `catalog.css:1017` 既有 reduce 區塊，不破壞）。
- [x] AC5：保留 Vue `compact-page-fade` 作為 VT 不支援／flag-off 的 graceful 退化路徑（point 1）；VT 支援時改由 `::view-transition-old/new(root)` keyframes 重現 translate+fade 手感。兩條路徑互斥（同一次換頁只有一套作用，由 AC1 middleware 保證），translate 量／timing 以共用值（CSS 變數或共寫一處）定義，避免兩處 drift。
- [x] AC5a：A1 測試不得新增或沿用讀 Vue source 的 `toContain`／regex 假斷言；ProductCard／ProductDetail 的 `view-transition-name` 以 mount 後 DOM style 驗收，middleware 以 function-level unit test 驗收，CSS pseudo-element 規則若無法以 DOM 驗收，才允許限定在 CSS contract 測試。

**B. 分類 chip bar 持久化**
- [x] AC6：抽出共用 `CategoryChipBar` 元件，首頁與 `/category/{id}` 頁皆使用之，chip 資料單一來源（`navigation.category_chips`），不在兩頁各寫一份（對齊 032 B 防 drift 精神）。
- [x] AC7：active 判定隨路由——首頁 active=`全部`（`all`），`/category/{id}` 頁 active=當前 `{id}`；非 active chip 為連結（`全部`→`/`，其餘→`/category/{id}`），沿用 031 AC2 的 anchor 行為（可爬、可右鍵開新分頁）。
- [x] AC8：響應式沿用首頁既有規則——桌機（`@media min-width:1200px`）`display:none`，iPad/手機顯示；分類頁的 chip bar 套用同一條規則，桌機照舊靠 sidebar 分類導航，不重複出現。
- [x] AC9：chip href／active／aria-pressed／count 以 render 後 DOM 斷言驗收；桌機隱藏行為用 Playwright desktop viewport 或 `agent-browser` 實際瀏覽器 smoke 驗證 `display:none`，不得只靠 happy-dom media query 或 source-grep 型假斷言（對齊 031 AC13）。

## 相關檔案

- `app/middleware/disable-vue-transitions.global.ts` — 新增，A 的 middleware
- `nuxt.config.ts` — `app.pageTransition`／`experimental.viewTransition` 之間關係（A，可能調整或移除 dead config）
- `app/assets/styles/catalog.css` — VT root keyframes（A，`946+`／`991+` 區塊）；chip bar 響應式 class（B，`1237` 的 `@media`、`1295` 的 `display:none`）
- `app/components/category-chip-bar.vue` — 新增，B 的共用元件
- `app/pages/index.vue` — 改用 `CategoryChipBar`（B，`6-24` 現居的 chip 列）
- `app/pages/category/[id].vue` — category 頁插入 `CategoryChipBar`（B）；不得插入共用 `taxonomy-page.vue`，避免外溢到 tag/brand/channel
- `app/composables/use-catalog-shell-data.ts` — 可能擴充吐出 `category_chips`，供 chip bar 在分類頁取用（B）
- `app/utils/published-products/compact-app.ts` — `getCategoryChips(chips, active_id)` 既有，沿用（B）

## 既有資產盤點 / Reuse Map

| 既有資產 | 位置 | 本次如何沿用 |
|---|---|---|
| morph markup（同名 `view-transition-name`） | `product-card.vue:6,18`、`product-detail.vue:11` | 已接好（`product-image-{id}` 兩端同名），A 不動 markup，只解除被 Vue `out-in` 阻斷的問題 |
| VT group/root CSS、reduce fallback | `catalog.css:991-1015`、`1017-1044` | 沿用；A 若保留 translate+fade 改寫成 root keyframes 疊加於此，reduce 區塊不動 |
| Vue pageTransition 設定 | `nuxt.config.ts:53`（`compact-page-fade` out-in 320ms） | A 的衝突來源；保留為 graceful 退化路徑，由 middleware 僅在 VT 接手時關閉（ADR-1/2） |
| `disable-vue-transitions` middleware pattern | view-transitions skill 範例 | 沿用其判斷骨架，加上「與 flag 綁定」的耦合（AC2） |
| 首頁 chip 列 markup（UButton anchor + chip-count） | `index.vue:6-24` | 抽成 `CategoryChipBar`，原地改引用 |
| `getCategoryChips(chips, active_id)` | `compact-app.ts:57` | chip active 套用邏輯，分類頁沿用同函式（active=當前 id） |
| `navigation.category_chips` 資料 | payload（`useCatalogShellData`/`useCatalogData` 已載入的 `useAsyncData('public-content')`） | chip bar 單一資料來源；分類頁經擴充後的 shell data 取用，零新 fetch |
| chip bar 響應式 `display:none` | `catalog.css:1295`（`@media min-width:1200px`，`1237`） | 共用元件套同一條規則，桌機隱藏 |
| `.category-chip-list` / `.category-chip` 樣式 | `catalog.css:118-130`、`126` | 共用元件沿用既有 BEM-like class，不新造樣式 |

新建項目：`app/middleware/disable-vue-transitions.global.ts`（A，無既有 middleware，`app/middleware/` 目前為空）、`app/components/category-chip-bar.vue`（B，首頁 chip 列首次被第二處頁面需要，符合「第三次／穩定 concept 才抽」中「第二處已出現且為防 SEO/行為分歧」的提早抽象觸發）。已搜尋 `app/middleware`、`app/components` 確認無同類可複用。`CategoryChipBar` 只由首頁與 `app/pages/category/[id].vue` 使用，不放入 `taxonomy-page.vue`，避免 tag/brand/channel 頁超出本 sprint 範圍。

## 介面 / 資料結構

純前端、route-aware 元件，無網路協定、無 props（自洽，ADR-3）。

VT flag SSOT：
- `nuxt.config.ts` 以 module-level 常數（例如 `const ENABLE_VIEW_TRANSITION = true`）同時設定 `experimental.viewTransition` 與 `appConfig.enableViewTransition`（兩者皆 build-time、非 env-overridable，真正同源）
- `disable-vue-transitions.global.ts` 只讀 `useAppConfig().enableViewTransition` 與 `document.startViewTransition`，兩者都成立才關閉 Vue transition
- 測試矩陣：flag=true/false × `document.startViewTransition` 存在/不存在，驗證只有 true+supported 會修改 `to.meta.pageTransition`／`to.meta.layoutTransition`

內部資料流：
- chips 來源：擴充 `useCatalogShellData()` 吐出 `navigation.category_chips`（既有 payload，零新 fetch）
- active 解析：`useRoute()` → 路徑 `'/'` → active=`'all'`；`'/category/{id}'` → active=route param `id`
- 套用：`getCategoryChips(category_chips, active_id)`（既有，`compact-app.ts:57`）產 `CompactCategoryChip[]` 後渲染

`CompactCategoryChip`（既有，`types.ts`）：`{ id, label, count, active }`。

SSG 安全：`useAsyncData('public-content')` 已於 layout（`useCatalogShellData`）載入，元件取用共享快取、prerender 安全。

## 邊界案例

- **Case 1：VT 不支援的瀏覽器（無 `document.startViewTransition`）** → middleware 不關 Vue transition，維持既有 `compact-page-fade` translate+fade，行為與現況一致。
- **Case 2：`viewTransition: false`（gate FAIL／未驗證 revert）** → middleware 偵測 flag/不啟用，Vue transition 維持運作，不得出現「完全無動畫」（AC2）。
- **Case 3：`prefers-reduced-motion: reduce`** → 兩套系統都靜默，無 morph、無 translate（AC4）。
- **Case 4：分類頁直接深連結進入（非從首頁點擊）** → chip bar 仍 render，active=該分類，其餘 chip 為可點連結（AC7）；無 morph（無來源卡片）屬正常。
- **Case 5：詳情頁資料為 per-id route async 載入（028 拆分）** → morph 需新頁 hero 在快照時存在；A1 必須以 browser smoke 或可 stub 的 VT callback 測試確認點卡片後新頁 hero 已在快照時 render，必要時以 lazy/await 策略處理並記錄於 works。
- **Case 6：桌機（≥1200px）** → chip bar `display:none`，分類導航走 sidebar，首頁與分類頁皆不顯示重複 pill（AC8）。

## ADR

### ADR-1：以 middleware 偵測 VT 支援、graceful 退化，VT 為單一轉場系統
- 決策：新增 `disable-vue-transitions.global.ts`，偵測 `document.startViewTransition` 支援度＋`appConfig.enableViewTransition`；會交給 VT 時才把該次 `pageTransition`/`layoutTransition` 設 `false`。`enableViewTransition` 與 `experimental.viewTransition` 由 `nuxt.config.ts` 同一個 module-level 常數設定、皆 build-time 烤入、非 env-overridable，避免 flag drift（031.1 xreview 將原 `runtimeConfig.public` 改為 `appConfig`，杜絕 `NUXT_PUBLIC_*` env 單邊覆寫破口，見 AC2）。
- 原因：兩套系統並存是 morph 失效與動畫互打的根因；`out-in` 會延後新頁掛載，使 VT 拍新快照時詳情 hero 不在場。關掉 Vue transition 後 VT 能在同一次換頁取得正確 old/new 快照。偵測支援度可 graceful 退化（不支援／flag-off → 保留 Vue translate+fade）。此為 view-transitions skill 文件指定解法，且採使用者／GPT 的 graceful degradation 建議（point 1）。
- 替代方案：(a) 改 Vue transition mode 為 `in-out` 或拿掉 `out-in`——仍是兩套並存、時序脆弱；(b) 全站關 Vue transition 不判斷——VT 不支援的瀏覽器會完全無轉場，違背 graceful 退化。皆不如「依能力 gate 的 middleware」。

### ADR-2：保留 Vue compact-page-fade 當退化，VT 路徑用 root keyframes 重現手感
- 決策：保留 Vue `compact-page-fade` 作為 VT 不支援／flag-off 的退化路徑；VT 支援時改由 `::view-transition-old/new(root)` keyframes 重現「往上滑一點＋fade」手感。兩條路徑由 middleware 確保每次換頁互斥。
- 原因：使用者採 GPT 的 graceful degradation（point 1）。退化路徑需要 Vue transition 提供動畫；若移除 `compact-page-fade`，不支援 VT 的瀏覽器（含 gate FAIL revert 回 `false`）會完全無轉場。兩條路徑是「兩種瀏覽器能力、每次換頁互斥」，非同一元素同時疊兩套樣式，不違反 Styling SSOT。translate 量／timing 以共用值定義避免 drift（AC5）。
- 替代方案：移除 `compact-page-fade` 只靠 VT——config 更少但犧牲退化體驗，與 point 1 衝突，不採。

### ADR-3：CategoryChipBar 為自洽、route-aware 元件（以 build 好做為準）
- 決策：`CategoryChipBar` 內部以（擴充後的）`useCatalogShellData()` 取 `navigation.category_chips`、以 `useRoute()` 解析 active，兩頁僅放 `<CategoryChipBar />`、不傳 props。
- 原因：使用者指示「以 build 模式好做為準」（point 2）。自洽元件讓兩頁零樣板、chip 邏輯單一所有者（SSOT）；payload 經 `useAsyncData('public-content')` 已共享載入，SSG/build 安全、零新 fetch，最省 wiring。分類 chip bar 本質是隨當前路由變化的導航元件，耦合 `route` 屬語意正確而非 smell。
- 替代方案：純展示、頁面傳已套 active 的 chips——元件可不依賴 route 易隔離測試，但兩頁各自接線、active 邏輯散落；本元件與 route 天然耦合，不值得為隔離而外推。測試以 mount（mock 共享 payload／route）斷言 DOM，仍可行（沿用 `nuxt-ui-component-adoption.test.ts` 既有 mount 模式）。

## Milestones

### Milestone A1: View Transition 與 Vue transition 衝突修復（morph 生效）
> 範圍：`app/middleware/disable-vue-transitions.global.ts`（新增）、`nuxt.config.ts`、`catalog.css`（VT root keyframes / reduce 區塊）、`tests/view-transition.test.ts`（契約測試擴充）
> 驗證：`pnpm test` 轉場契約測試（middleware flag/support 矩陣、mount 後 DOM 同名 view-transition-name、reduce 全靜默）；不得用 Vue source-grep 假斷言。VT 開啟下行為以 Playwright／agent-browser browser smoke 驗證新頁 hero 在 snapshot 時序可用；morph 視覺由使用者 iPad/桌機 Safari/Chromium 實機確認
> 預期結果：VT 開啟時換頁只有一套動畫；卡片→詳情圖片 morph 出現；`reduce` 無動畫；`viewTransition:false` 時 Vue translate+fade 正常、無「完全無動畫」破口
- [x] Red → Green → Refactor

### Milestone B1: 共用 CategoryChipBar，分類頁持久化 chip bar
> 範圍：`app/components/category-chip-bar.vue`（新增）、`app/pages/index.vue`、`app/pages/category/[id].vue`、`use-catalog-shell-data.ts`（擴充 category_chips，如需）、`catalog.css`（響應式 class）、對應元件測試
> 驗證：`pnpm test` render 後 DOM 斷言——首頁與分類頁皆 render chip bar；active 隨路由；非 active 為連結；count/aria-pressed 正確。桌機隱藏用 Playwright desktop viewport 或 `agent-browser` 實際瀏覽器 smoke 驗證；tag/brand/channel 頁不得出現 category chip bar。`pnpm content:check` 不受影響
> 預期結果：iPad/手機從首頁點分類進 `/category/{id}` 後 chip bar 仍在、active 為當前分類、可直接切換；桌機不重複出現
- [x] Red → Green → Refactor

> 順序：A1 與 B1 互相獨立，可平行或任意順序。B1 不受 iPad Safari gate 影響、可先落地；A1 的 morph 視覺驗收依賴使用者實機（AC10 gate）。
