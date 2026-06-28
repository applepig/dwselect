# 031.1 工作紀錄

> 子 sprint，續用 `feat/031-taxonomy-nav-single-source` 分支。SSOT 為 `spec.md`。
> 兩個 milestone（A1 轉場修復、B1 分類 chip bar 持久化）互相獨立，以 ultracode workflow 序列實作（共改 `catalog.css`，避免平行寫檔競爭）＋平行 cross-review。

## 概述

A1 與 B1 皆已落地、quality gate 全綠（容器內 `verify`：test→lint→typecheck→generate，516 routes prerendered；unit 585 passed）。2026-06-28 follow-up 已修正 A1 morph 契約為獨立 shell layer（`.product-transition-shell.product-vt-card`）加 sibling shared elements（圖片、標題、摘要、價格），並補齊 middleware 同時關閉 `to`／`from` route meta，避免離場頁仍跑 Vue `compact-page-fade-leave-*`。後續整理新增 `product-view-transition` helper 與共用 `product-vt-*` class，集中 VT name/class 契約，避免 card/detail 各自手寫 drift；debug `1s` timing 已收回為 root fade delay `0s`、shared elements delay `0.1s`、duration `0.35s`。完整 `pnpm test` 592 passed、`pnpm lint` passed、`pnpm typecheck` passed。cross-review 0 high-severity；medium 缺口（測試覆蓋）已由補測 milestone 關閉；morph 視覺仍受 031 AC10 iPad Safari gate 管，待使用者實機裁決。**尚未 commit**。

2026-06-28 desktop 對齊 follow-up：desktop `.compact-panel` 改為 `padding: 20px 40px 0` 對齊 header 外框；`.product-grid` 加 `margin-inline: 41px` 保留商品列表額外縮排；`.detail-content` 與 `.related-products-section` desktop padding 改為 `40px`，讓 detail 內文與 related grid 對齊 breadcrumb 內文。agent-browser 1280px 驗證：header/detail/search 外框 `272/1240`，breadcrumb/detail inner/product grid `313/1199`。`tests/nuxt-smoke.test.ts` green，`pnpm lint` passed。

## Milestone B1：共用 CategoryChipBar，分類頁持久化 chip bar

### 變更
- `app/components/category-chip-bar.vue`（新增）：自洽 route-aware 共用元件（ADR-3，無 props）。以 `useCatalogShellData()` 取 `navigation.category_chips`（單一資料源）、`useRoute()` 解析 active（`/`→`'all'`，`/category/{id}`→param id，陣列取首值），`getCategoryChips()` 套 active 後渲染。沿用既有 `UButton` anchor + `chip-count` + `category-chip` markup。
- `app/composables/use-catalog-shell-data.ts`：回傳物件擴充 `category_chips`（取自 payload `navigation.category_chips`），零新 fetch。
- `app/pages/index.vue`：移除原 inline chip 列（舊 6-24），改置 `<CategoryChipBar />`；外層包 `.compact-page` 滿足單一 template root（ESLint `vue/no-multiple-template-root`）。
- `app/pages/category/[id].vue`：於 `<TaxonomyPage>` 之上插入 `<CategoryChipBar />`（**不**放進 `taxonomy-page.vue`，避免外溢 tag/brand/channel）；外層同樣包 `.compact-page`。
- `app/assets/styles/catalog.css`：桌機（`@media min-width:1200px`）`display:none` 選擇器由 `.home-category-chip-list` 改為共用的 `.category-chip-bar`，兩頁同元件同 class 共吃隱藏規則。未動 VT/reduce 區。

### 驗收對帳
- **AC6**（共用元件、單一資料源）：✅ 兩頁皆只放 `<CategoryChipBar />`；`taxonomy-page-shell.test.ts` 正向斷言 category 頁含 `<CategoryChipBar`，負向斷言 tag/brand/channel 不含（鎖非目標邊界）。
- **AC7**（active 隨路由、非 active 為可爬 anchor）：✅ `category-chip-bar.test.ts` mount 後 DOM 斷言；實機驗證首頁「全部」active href=`/`、分類頁「電腦3C」active href=`/category/computer-3c`。
- **AC8**（桌機 `display:none`、行動顯示）：✅ 實機 1280px 兩頁皆隱藏（靠 sidebar）、834px 顯示；e2e 桌機隱藏案例（分類頁）green。
- **AC9**（DOM 斷言 + 桌機隱藏實機驗）：✅ unit DOM 斷言 + Playwright 桌機/行動 viewport 案例 green。

## Milestone A1：View Transition 與 Vue transition 衝突修復

### 變更
- `nuxt.config.ts`：新增 module-level 常數 `ENABLE_VIEW_TRANSITION`，同時餵 `experimental.viewTransition` 與 `appConfig.enableViewTransition`（AC2 SSOT，杜絕 flag drift；xreview 後由 `runtimeConfig.public` 改為 `appConfig`，見下方 xreview 修正）。
- `app/middleware/disable-vue-transitions.global.ts`（新增）：client-only global middleware。讀 `useAppConfig().enableViewTransition` + `document.startViewTransition`，兩者皆真才把該次 `to.meta.pageTransition`/`layoutTransition` 設 `false`。抽出純函式 `shouldHandOverToViewTransition()` 供矩陣測試。不 import `nuxt.config.ts`。
- 2026-06-28 follow-up：middleware 改為同時設定 `to.meta` 與 `from.meta` 的 `pageTransition/layoutTransition = false`；原實作只改 `to.meta`，Nuxt 仍會對離場頁套 `compact-page-fade-leave-*`，使 `mode: out-in` 延後詳情頁掛載並破壞 shared-element snapshot。
- 2026-06-28 nested follow-up：`.product-card` ↔ `.product-detail-page` 保留外框 morph；`.product-image-tile` ↔ `.detail-hero-tile`、`.product-name` ↔ `.detail-title`、`.product-summary` ↔ `.detail-dw-says`、`.product-card-price` ↔ `.detail-price` 各自同名，避免內部內容只跟著整張 card bitmap scale 後 fade。
- 2026-06-28 cleanup follow-up：新增 `app/utils/product-view-transition.ts`，以 `getProductViewTransitionStyle(id, part)` 集中產生 `view-transition-name`；card/detail 對應元素共享 `product-vt-card/image/title/summary/price` class，CSS 只針對這些共用 class 設 `view-transition-class` 與 reduce 關閉規則。
- 2026-06-28 shell-layer follow-up：`product-vt-card` 從 `.product-card` / `.product-detail-page` root 移到獨立 `.product-transition-shell` 背景層，root 不再帶 `view-transition-name`。原因：named parent 會把 descendants 吃進外層 snapshot，文字與價格不易獨立 transition；shell layer 讓外框 morph 與 title/summary/price 成為 sibling shared elements。
- 2026-06-28 timing follow-up：VT root fade 使用 `animation-delay: 0s`、duration `0.35s`；shell 與 child shared-element pseudo-elements 使用 `--dw-view-transition-delay: 0.1s`、duration `0.35s`；Vue fallback `compact-page-fade` 仍保留 `320ms` 退化路徑。
- `app/assets/styles/catalog.css`：no-preference 區新增共用 `--dw-page-transition-shift/-duration/-easing` 變數，`compact-page-fade` 保留 Vue fallback translate；VT root `@keyframes dw-page-fade-in/out` 改為 fade-only，避免重現 Vue-like 下滑手感；`.product-card` group 負責卡片到詳情頁的 morph。reduce 區納入 `.product-detail-page`，可關閉 card-level morph。

### 驗收對帳
- **AC1**（middleware 接手時關 Vue transition）：✅ `disable-vue-transitions.test.ts` handler 測試 green；2026-06-28 補驗 `to`／`from` 兩邊 meta 皆需關閉。agent-browser smoke 確認首頁點商品進詳情期間沒有 `compact-page-fade-*` mutation events。
- **AC2**（flag 綁定 SSOT、client 只讀 runtimeConfig）：✅ flag×support 4 象限矩陣，只有 `true+supported` 會改 meta；flag-off+supported 不關 Vue transition（不致「完全無動畫」）。
- **AC3**（卡片→詳情同名 morph、新頁內容在快照時存在）：⚠️ **契約已驗、視覺待實機**。外框由獨立 `.product-transition-shell.product-vt-card` 同名 morph；圖片、標題、摘要、價格為 sibling shared elements，避免被 named parent snapshot 吃掉。agent-browser smoke 確認首頁與詳情頁 root 都是 `view-transition-name: none`，shell/title/summary/price 皆有對應 `product-*` name，且導航期間沒有 `compact-page-fade-*` mutation events。
- **AC4**（reduce 全靜默）：✅ reduce 區未改動，CSS contract 斷言保留；實際媒體查詢生效須瀏覽器驗。
- **AC5**（保留 compact-page-fade 退化、VT root 不重現 Vue slide）：✅ `compact-page-fade` 保留並改讀共用變數；VT root keyframes 改為 fade-only，translate shift 僅留在 Vue fallback。
- **AC5a**（不得用讀 Vue source 的假斷言）：✅ 移除原 `view-transition.test.ts` 讀 `.vue` source 的 `toContain` view-transition-name 假斷言，改 SSR `renderToString` 驗 id 流入命名；middleware function-level 測試；pseudo-element 規則限 CSS contract。

> happy-dom 限制（已實證）：Vue 以 hyphen-key 綁定的 `view-transition-name` 不進 CSSOM，`el.style.viewTransitionName` 取不到；故改用 `renderToString` 序列化 style 字串驗收，仍為 render 後 markup、符合 AC5a 意圖。

## 測試

- 新增：`tests/category-chip-bar.test.ts`（B1 元件 DOM）、`tests/disable-vue-transitions.test.ts`（A1 middleware 矩陣）。
- 新增：`tests/product-view-transition.test.ts`（VT helper 命名與 style shape）。
- 重構：`tests/view-transition.test.ts`（AC5a 去假斷言）、`tests/nuxt-ui-component-adoption.test.ts`（首頁委派子元件）、`tests/nuxt-smoke.test.ts`（source-grep 對齊）。
- 守護補強：`tests/published-products/taxonomy-page-shell.test.ts`（category 正向 + tag/brand/channel 負向）、`tests/e2e/compact-app.spec.ts`（分類頁桌機隱藏 + 行動持久化）。
- 結果：unit 585 passed；2026-06-28 follow-up 後 `pnpm test` 588 passed；VT helper cleanup 後 `pnpm test` 592 passed、`pnpm lint` passed、`pnpm typecheck` passed；`taxonomy-page-shell` 6 passed；e2e `compact-app -g "chip bar"` 70 passed / 17 skipped / 0 failed；容器 `verify` 全綠。

## Frontend Handoff（agent-browser 實機 smoke，dwselect.toybox.local）

- 桌機 1280px：首頁與 `/category/computer-3c` chip bar 皆 `display:none`、sidebar 在；`/tag/display` 無 category chip bar（非目標邊界成立）。
- 平板 834px：首頁 chip bar 顯示（8 顆，「全部 71」active）、sidebar 隱藏；進 `/category/computer-3c` 後 chip bar **持久化**、「電腦3C 15」aria-pressed=true（user story B 成立）。雙 `.compact-panel` padding 視覺無回歸。
- Morph 契約（2026-06-28 follow-up）：首頁與詳情頁 root 不命名；獨立 shell 同名 `product-card-2026-06-02-altwork-station` 且 `view-transition-class: product-card`；圖片、標題、摘要、價格分別同名 `product-image-*`、`product-title-*`、`product-summary-*`、`product-price-*`，避免內部元素只隨整張 bitmap scale。

## Cross-review 處置

- 0 high-severity。
- medium（測試覆蓋缺口）→ 已由補測 milestone 關閉（category 接線 + tag/brand/channel 邊界 + e2e 桌機隱藏/行動持久化）。
- A1 review verdict pass，僅 low nits。

### xreview 修正（claude:opus + codex:gpt-5.5 共 2 Important + 2 Low；gemini 因帳號 tier 失敗略過）

- **[Issue #1 / Important] VT flag env-override drift**：`runtimeConfig.public.*` 吃 `NUXT_PUBLIC_*` env 覆寫、`experimental.viewTransition` build-time only 不吃 env，兩者不對稱會讓 `NUXT_PUBLIC_ENABLE_VIEW_TRANSITION=false` 復活雙動畫且 AC2 測試（config 物件靜態相等恆真）擋不住。→ 改用非 env-overridable 的 `appConfig.enableViewTransition`，middleware 改讀 `useAppConfig()`，spec AC2/ADR-1/介面段同步更新；`disable-vue-transitions.test.ts` 改 stub `useAppConfig`、`view-transition.test.ts` AC2 斷言改 `nuxt_config.appConfig`。→ verify 全綠、587 tests passed。
- **[Issue #2 / Important] AC3 契約測試未覆蓋真實瀏覽器 morph 視覺**：`renderToString` 同步餵完整 prop，只證同名 naming 非瀏覽器動畫視覺。→ 2026-06-28 follow-up 改為 card-level contract：`.product-card` 與 `.product-detail-page` 同 `product-card-{id}`、圖片/hero 不獨立命名；缺口收斂為 AC10 人工視覺 gate。
- **[Issue #3 / Low] regex 邊界脆弱**：`getInlineViewTransitionName` 的 `\b${class}\b` 會誤命中 `product-card-link`/`-stub`。→ 改 lookbehind/lookahead `(?<=["\s])${class}(?=["\s])` 框完整 token，新增 hyphenated-sibling regression 測試。
- **[Issue #4 / Low] `.compact-page` 無樣式 wrapper**：→ `catalog.css` 補 `.compact-page { display: flex; flex-direction: column; }` 顯式化堆疊。實機量測 834px 兩 `.compact-panel` box 間距本為 0px（視覺 18px 來自下方面板 `padding-top`），故 gap 維持 0 避免疊加回歸；改前後量測一致、視覺零回歸（首頁＋`/category/computer-3c`，桌機 1280px chip bar 仍 `display:none`）。

### 發 PR 前 review 修正（2026-06-29）

`@ddd-reviewer` 發 PR 前最終把關，抓到 1 Critical + 1 Important + 3 Low；Critical 已修，commit 切分依使用者裁定。

- **[Critical] `/guide/{id}` 詳情頁失去 panel 背景**：A1 把共用選擇器 `.product-detail-page, .product-detail-sheet, .product-detail-modal` 背景由 `var(--dw-panel)` 改為 `transparent`，僅靠 `.product-detail-page > .product-transition-shell` 補回。`product-detail.vue` 有 shell 子層、正常；但 `guide-detail.vue` 同掛 `.product-detail-page` 卻無 shell → guide 詳情頁露出頁面底色 `--dw-bg`（border/shadow 仍在）。works 原 smoke 清單未涵蓋 guide，故漏網。→ **使用者裁定**：給 `guide-detail.vue` 補 `<span class="product-transition-shell" aria-hidden>` 背景層（只掛 `product-transition-shell`、不掛 `product-vt-card`，guide 不參與 morph）。新增 `tests/guide-detail-render.test.ts` 2 個守護測試（render 後 DOM 有 shell 子層、且 shell 不含 `product-vt-card`）Red→Green。agent-browser 實機（`/guide/2026-06-02-aeron-chair`）量測 shell computed background = `#fffaf1`（`--dw-panel`）≠ 頁面 `#f6f1e7`（`--dw-bg`），截圖確認 panel 表面回復。
- **[Important] 夾帶桌機 padding 對齊改動（scope drift）**：`.compact-panel`/`.product-grid`/`.detail-content`/`.related-products-section` 的桌機內距重新對齊（works「desktop 對齊 follow-up」）超出 031.1 spec A1/B1 範圍。→ **使用者裁定**：併入單一 `feat(031.1)` commit（不細拆 A1/B1/桌機三 commit），PR body 註明含桌機內距對齊。
- **[Low] chip-bar dead 防禦碼註解**：`category-chip-bar.vue:33-35` 註解稱 catch-all 可能回陣列，但 `category/[id]` 為單段路由、`route.params.id` 恆為 string。→ 僅修註解據實描述（`Array.isArray` 分支為對齊 `[id].vue` 的防禦 fallback，且 `category-chip-bar.test.ts:155` 有驗該分支，故保留碼）。
- **[Low] 首頁 ~355 個 VT group**：71 卡 × 5 shared element，iPad Safari 可能卡頓 → 併入 AC10 人工 gate 留意。
- **[Low] nuxt-smoke source-grep baseline**：`product-vt-*`／helper 存在性 grep 屬 smoke baseline，未違反 AC5a（命名行為已由 `view-transition.test.ts` render 後 markup 驗）→ 不擴張即可。
- `.product-detail-sheet`/`.product-detail-modal` 經 grep 確認無任何元件渲染（僅 catalog.css dead 選擇器），目前無同類掉背景風險；未來新增 sheet/modal 元件需補對應 `> .product-transition-shell` 背景規則。
- 修後 `pnpm test` 594 passed、`pnpm lint` passed。

### Follow-up：移除 taxonomy 頁內 section title（2026-06-29）

使用者回報 `/category/{id}` 出現「商品」h2，認為「早該拿掉」。查證：`taxonomy-page.vue` 自建立（c5e737c）以來該 h2 從未改動，非本分支 commit 的 git regression；是 031 把分類瀏覽從「首頁篩選檢視（無標題）」改導向 taxonomy 頁（自帶商品／指南／連結三顆 section title）後新出現的體感落差。使用者裁定：breadcrumb 已完整描述頁面，section title 多餘 → **三顆全部移除、徹底不再出現**。

- `app/components/taxonomy-page.vue`：移除商品／指南／連結三顆 `<h2 class="section-title taxonomy-section-title">`，保留各 section 的 `aria-label`（無障礙不退化）。
- `app/assets/styles/catalog.css`：移除變死碼的 `.section-title`（共用選擇器只留 `.top-bar-title`）、`.section-title` 字級規則、`.taxonomy-section-title`，更新 taxonomy 區註解。經查 `.section-title`/`.taxonomy-section-title` 僅 taxonomy-page.vue 在用，移除後無其他引用。
- `tests/published-products/taxonomy-page-render.test.ts`：新增守護測試——三段全有時斷言不渲染任何 `.section-title`/`.taxonomy-section-title`/`h2`（Red→Green）；搭配 `nuxt-smoke.test.ts` 既有負向斷言防再冒出。
- 驗證：`pnpm test` 595 passed、`pnpm lint` passed。agent-browser 實機 `/category/computer-3c`（h2count=0、grid 在）、`/tag/cleaning`（商品＋指南兩段無標題、版面正常）。

## Open issues / 待使用者裁決

- **AC3 / AC10 gate**：card-level morph 視覺需使用者在 **iPad Safari／桌機 Chromium** 實機確認。亦須確認 `viewTransition:false` 退化路徑（Vue translate+fade）不致「完全無動畫」。此為 031 AC10 既有 gate，本 sprint 不改變 gate 結論。
- **瀏覽器 morph 視覺無自動化守護（xreview Issue #2）**：`view-transition.test.ts` 只以 `renderToString` 驗 card／detail 同 `view-transition-name`（naming）與圖片未獨立命名；agent-browser smoke 確認 DOM/CSS 契約與頁面載入，但不等同慢動作視覺驗收。morph 是否符合體感仍依賴 AC10 人工 gate。
- 若 iPad Safari hydration 仍 crash（031 既有風險），merge/上線前須維持 `ENABLE_VIEW_TRANSITION=false` revert 退路。

## Code health backlog（移交 032，不阻塞）

- `catalog.css` 桌機隱藏 CSS contract 斷言在 `category-chip-bar.test.ts` 與 `nuxt-smoke.test.ts` 寫死換行/縮排、兩處重複 → 收斂為單一來源、改容忍空白的 regex。
- `view-transition.test.ts` reduce 區 contract 用貪婪 `[\s\S]*`，可能跨 block 假陽性 → 改 brace-matching 或非貪婪。
- `getCompactAppView().home.category_chips` 改用子元件後成死資料路徑 → 隨 032 清理。

## 狀態

- 未 commit（待使用者授權）。發 PR 前 review 已過（Critical 已修、見上節）。commit 切分依使用者裁定：**併入單一 `feat(031.1)` commit**（含 A1 VT 修復、B1 chip bar、桌機內距對齊、guide 背景修復）。`pnpm test` 594 passed、`pnpm lint` passed；容器 `verify` 待最終確認。
