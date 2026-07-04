# Works: 032 Code Health 去重與 magic string 收斂

## Milestone 1: buildSeoMeta SEO meta helper（A3 + A2）

- **技術決策**：
  - `buildSeoMeta` 採純函式（ADR-1），只回傳 `useSeoMeta` 的 input object，頁面仍寫字面 `useSeoMeta(buildSeoMeta({...}))` 且在 `await ...Data` 之前——保留 `useHead(`/`useSeoMeta(` 字面與順序，head-before-await 不變式（`nuxt-smoke.test.ts:656`）天然維持綠，不需放寬測試。
  - 入參型別 `MaybeRefOrGetter<string>`，pass-through 不 `toValue`，同一 ref／getter 鋪到多欄由 `useSeoMeta` 各欄解包，維持 reactivity（支援 detail 頁 computed 與 taxonomy 頁 computed）。
  - optional `imageAlt` 用 guard clause 早退：未給時不放 `ogImageAlt`/`twitterImageAlt` 鍵（對映 domain 二分——靜態／taxonomy 頁用站台預設 OG 圖無 per-page alt，detail 頁有實圖才有 alt）。此「未給即省略 key」由測試 `not.toHaveProperty` 守為契約。
  - `buildSeoMeta`（組 payload）與既有 `buildTaxonomyPageSeo`（算 title/description/canonical/og_image 值）刻意分層協作，未合併或刪除後者。
- **問題與解法**：
  - **`index.vue` 不套用**（DONE_WITH_CONCERNS 第 1 點，coordinator 已核可）：該頁刻意 `title: SITE_TITLE`（長標題）≠ `ogTitle: SITE_NAME`（短品牌名），`buildSeoMeta` 會把單一 title collapse 成三欄，套用將改變 og:title 輸出，違反非目標「meta 等價」並破 `launch-seo.test.ts:51` 的 `ogTitle: SITE_NAME` 守門。決策：排除 index.vue，維持 inline；不為它加 `ogTitle` override（YAGNI／逾 ADR-1）。`app.vue`（app shell）同理本就不在範圍。spec AC3 已註記此例外。
  - **測試同步 `taxonomy-page-shell.test.ts:39-46`**（DONE_WITH_CONCERNS 第 2 點，coordinator 已核可）：原斷言 grep taxonomy 頁含字面 `ogImage: SITE_OG_IMAGE`／`twitterCard: 'summary_large_image'`，正是本 milestone 要刪的 12 欄區塊內容。改為 grep `buildSeoMeta({` + `image: SITE_OG_IMAGE`——行為守門（走共用 builder + 站台預設 OG 圖、非 bespoke meta）等價或更強，被移走的鋪展細節改由 `seo-metadata.test.ts` 6 案例覆蓋。判準「行為還在不在：在」，屬正當測試同步非規避。未動任何 head-before-await 斷言。
- **/simplify 結果**：4 角度（Reuse／Simplification／Efficiency／Altitude）平行審查，全部無 finding；唯一 optional 觀察（imageAlt guard 可壓 flat literal）因會破 `not.toHaveProperty` 契約且違反 guard-clause 慣例而不動。無需 apply 修正。
- **測試結果**：`pnpm test`（容器內）79 test files / 607 passed；`./dev.sh typecheck` exit 0、lint exit 0。新增 `tests/seo-metadata.test.ts` 的 `buildSeoMeta` 6 案例。前端實際開頁巡檢併入 AC19 整體驗收。

## Milestone 2: TAXONOMY_KINDS 設定表（A4-lite）

- **技術決策**：
  - 建 `app/utils/published-products/taxonomy-kinds.ts` 的 `TAXONOMY_KINDS`（kind 為 key），收斂原散在 breadcrumb／build／四頁的 kind→404 文案與 label getter。`resolve-breadcrumb-items.ts:resolveTaxonomyLabel`、`build-taxonomy-page-data.ts:resolveLabel` 改從表取，移除各自的 if 鏈。
  - **ADR-2 邊界**：表只收「一一對應映射」。`isSelectorIdInNamespace`（027 ADR-10 的 `/tag/{brand-id}` 跨 namespace 防呆）、`resolveDescription`（只 tag/brand 有 description）、`selectPublishedTaxonomyItems`（各 kind id 欄位差異）逐字未動。
  - **prefix 由 kind 衍生（/simplify 後的設計深化）**：初版表存字面 `prefix` + `getTaxonomyKindByPrefix` 反查 + breadcrumb `kind === null` 防呆。/simplify 三個 reviewer（Simplification F1、Altitude F1/F3）獨立指出這是同一個「kind↔prefix 來回換算」且 null 分支結構不可達。根因：prefix 機械上就是 `/${kind}/`，kind 即 url segment（Nuxt 檔案路由 `app/pages/{kind}/[id].vue` 鎖死），既有 `taxonomy-page-seo.ts:28` 已用 `/${taxonomy_kind}/` 衍生 canonical。決策：表移除 prefix 欄位、刪 `getTaxonomyKindByPrefix`，breadcrumb dispatch 改由 route 第一段 segment + `isTaxonomyKind`（`Object.hasOwn`）直接取 typed kind，移除 null 分支與 `TAXONOMY_PREFIXES`。spec ADR-2 同步更新。淨刪一欄、一函式、一死分支、一常數，讓「單一真相」名實相符。
- **問題與解法**：
  - **測試同步**：`nuxt-smoke.test.ts` 的 taxonomy prefix source-grep 隨 prefix 不存表而失效，改抓表的四個 kind key + 保留 breadcrumb 消費 `TAXONOMY_KINDS` 的 wiring 斷言（行為等價：守「四 kind 解析 label + breadcrumb 走單一真相」）。`taxonomy-kinds.test.ts` 移除 prefix／round-trip／unknown-prefix 測試（對應行為已移除），`notFoundMessage` 測試名由 overclaim 的「matching the taxonomy pages」（未 import 頁面）改誠實，頁面比對留 M3 接線時補。
  - **notFoundMessage 待 M3 結平**（Reuse F1）：表的 404 文案目前零 production 消費者，四頁仍 inline。M3 composable 接線時四頁改讀 `TAXONOMY_KINDS[kind].notFoundMessage` 並刪 inline literal，否則為永久雙真相。已記入 spec Milestone 3 範圍。
- **/simplify 結果**：4 角度平行審查 → 採納三 reviewer 收斂的 prefix 衍生深化（已 apply 並更新 spec）；Reuse F2（prefix 可搜性）、Simplification F4（tag/brand getLabel 重複）判定不動。
- **測試結果**：`pnpm test`（容器內）80 test files / 614 passed；`./dev.sh typecheck` exit 0。

## Milestone 3: useTaxonomyDetailPage composable（A1）

- **技術決策**：
  - 建 `app/composables/use-taxonomy-detail-page.ts`，收斂四頁（category／tag／brand／channel）逐行複製的 setup：route id 正規化（陣列參數取 `[0]`、`?? ''`）、canonical 由 `/${kind}/${id}` 同步推導、meta computed、`useHead`／`useSeoMeta` 註冊、`await useTaxonomyPageData`、null → 404（文案自 `TAXONOMY_KINDS[kind].notFoundMessage`，結平 M2 的 Reuse F1 雙真相）、`watchEffect` 同步 `page_data`。四頁 `<script setup>` 縮為 `const { page_data } = await useTaxonomyDetailPage(kind)`。
  - **head-before-await 不變式**：composable 內 `useHead`／`useSeoMeta` 皆在 `await useTaxonomyPageData` 之前呼叫，順序守住（新增 `use-taxonomy-detail-page.test.ts` 以 deferred fetch 斷言 call order `['useHead','useSeoMeta','useTaxonomyPageData']`）。
  - **template 各自保留**：category 頁多 `compact-page` wrapper ＋ `<CategoryChipBar>`，composable 只吞 script 共用邏輯，不碰 template 組成差異。
- **問題與解法（測試遷移）**：`taxonomy-page-shell.test.ts` 原本 grep 各頁 source 的 404／canonical／SEO builder 字面，這些邏輯已搬進 composable，改為斷言「四頁各以正確 kind 接線 composable」＋ template 差異（`compact-page`／`<CategoryChipBar>` 僅 category）；被移走的行為守門遷至 `use-taxonomy-detail-page.test.ts`（判準：行為還在，只是單一真相搬家）。

## Code Review 收斂（xhigh recall，M1–M3 全 sprint）

- **流程**：`/code-review` xhigh → 3 finder 角度 + 1 sweep 平行審查 → 逐項 verify。範圍收斂在 `a53401b..working tree` 的程式碼變更（排除跨 sprint 內容資料）。
- **結論**：重構行為保持，無會 ship 的正確性 bug。3 項低嚴重度 finding，依使用者指示全部收斂：
  1. **breadcrumb 裸 kind（reachable 化後修正）**：`resolve-breadcrumb-items.ts` 第一段 segment 匹配把裸 `/category`（無 id）誤判為 taxonomy 路由回 `[{label:'category'}]`（舊 `startsWith('/category/')` 會回 `[]`）。原本因 error 頁不套 layout 而不可達；因本次同步讓 **error.vue 套 default layout**（`app/error.vue` 內容包進 `<NuxtLayout>`，錯誤頁提供站台 chrome ＋ 首頁導回），breadcrumb 變 reachable，故加 `segments.length >= 2` guard 讓裸 kind 回 `[]`（等同回首頁）。
  2. **雙重計算（pre-existing regression）**：`use-taxonomy-detail-page.ts` 的 `meta_title`／`meta_description` 各呼叫一次 `buildTaxonomyPageSeo`，整包每次 recompute 算兩遍。抽單一 `taxonomy_seo` computed，兩者從中取值，null-guard 收一處。
  3. **測試缺口**：補 `page_data === null` 時 meta 墊 `SITE_NAME` 的 fallback 斷言。
- **測試結果**：`pnpm test`（host）81 test files / 623 passed；`pnpm lint` 綠。
- **待使用者實機驗證（host 限制無法執行）**：`./dev.sh exec ./dev.sh verify`（typecheck＋generate，特別是 error.vue 套 `<NuxtLayout>` 後 default layout `await useCatalogShellData()` 的 SSG 建置）；開錯誤頁確認三情境——(1) 不存在路徑 `/foobar`、(2) 裸 kind `/category`（breadcrumb 僅 `DW嚴選`）、(3) taxonomy 404 `/brand/不存在`——站台 chrome 正常、內容置中不與 top-bar 疊高、首頁連結可導回。
- **未收（依指示保留）**：`/category/{壞id}`（route 有配到、composable 丟 404）在新 layout 下 breadcrumb 會顯示 `DW嚴選 > 壞id`（raw-id fallback），本次只處理裸 kind，此案待實機看後由使用者決定。

## Milestone 4: 導覽 SSOT 與順序統一（B2）

- **技術決策**：
  - 建 `NAV_TABS`（含 `to`）於 `app/utils/published-products/compact-app.ts` 作單一真相；`COMPACT_APP_TABS` 由它 `.map` 省略 `to` 衍生（維持既有 `Array<Omit<CompactAppTab,'active'>>` 型別與 downstream 不變），`app-navigation.vue` 的 `nav_items = NAV_TABS`（顯式 import，不依賴 auto-import）。三份 tab 設定收斂為一，達成 AC14。
  - 統一順序為 `home/guide/links/search`（桌面為基準，ADR-3）。
- **問題與解法（分兩段落地）**：
  - 首個 developer 完成 `compact-app.ts` 的 `NAV_TABS`/`COMPACT_APP_TABS` 衍生後，發現 `nav_items` 若改引用 `NAV_TABS` 會使 `nuxt-smoke.test.ts:483-488` 的 source-grep（斷言 `.vue` 源碼含 `to: '/...'` 字面與 `id: 'links'` 早於 `id: 'search'`）失效——依鐵律在跨 milestone 共用測試檔前停手，交回 coordinator。coordinator 裁示：SSOT 搬家 → 守門重新指向新單一真相（比照 M2/M6）。第二段由 follow-up developer 完成 `nav_items = NAV_TABS` 並把 route/順序守門改對 `compact-app.ts`（`nav_tabs_source`）斷言、`nav_source` 只守消費 `NAV_TABS`。
  - **AC15 校正（xreview confirmed，low，見下 Cross Review 段）**：窄螢幕底部 tab／rail 實際由 `nav_items`（=`NAV_TABS`）渲染，舊版 `nav_items` 本即 `links/search`，故**無實際可見順序變更**；真正被 M4 統一的是 `COMPACT_APP_TABS`（`search/links`→`links/search`），但它僅經 `getCompactAppView().tabs` 暴露而無 template 消費（死資料路徑，源自 031.x，清理屬 032 範圍外）。spec AC15／ADR-3 已同步校正。
- **測試結果**：`vitest run --exclude 'tests/e2e/**'`（host）82 files / 629 passed；`eslint` exit 0。`compact-app.test.ts` 新增 NAV_TABS/COMPACT_APP_TABS 順序與衍生斷言。

## Milestone 5: ALL_CATEGORIES_ID 常數與型別對齊（B1 + C4）

- **技術決策**：
  - 新增 `export const ALL_CATEGORIES_ID = 'all'` 於 `app/utils/public-content-view-types.ts`（與 `CategoryChipView` 同檔，所有消費端已從此 import、零新增 import edge，build-time `build-navigation.ts` 亦可安全 import 純常數）。裸 `'all'` 全數改引用：`build-navigation.ts`、`selectable-category-ids.ts`、`compact-app.ts`、`category-chip-bar.vue`（三處）、`app-navigation.vue`（兩處）。`.vue` 顯式 value import，維持既有慣例。值仍為字串 `'all'`，純具名化、行為等價。
  - **C4**：`CategoryChipView.id` 的 `'all'` literal 以 `typeof ALL_CATEGORIES_ID` 對齊；`CompactCategoryChip.id` 由手寫 `Product['category_id'] | 'all'` 改引用 `CategoryChipView['id']`，`types.ts` 連帶移除變成未用的 `Product` type import。grep `| 'all'` 確認無其他分類相關手寫 union（未動 `CompactAppTabId` 等無關 union）。
- **問題與解法**：`nuxt-smoke.test.ts:513` grep `category.id === 'all' ? '/' : ...`（app-navigation 分類導向守門）隨常數化失效，同步為 `category.id === ALL_CATEGORIES_ID ? '/' : ...`，守住的不變式（首頁 chip→'/'、分類 chip→/category/{id}）不變。`category-chip-bar.test.ts` 的 active/href 行為測試 fixture `{ id: 'all' }` 保留（值不變，改引用常數反造無謂耦合，非行為斷言）。
- **測試結果**：`vitest run --exclude 'tests/e2e/**'`（host）82 files / 629 passed；`eslint`（8 檔）exit 0。
- **未驗證**：typecheck（容器未啟動）。型別皆等價替換（`typeof ALL_CATEGORIES_ID` 於 const 宣告推為 `'all'` literal；`CategoryChipView['id']` indexed access 取回同一 union），xreview types 維度亦無 finding，風險低。

## Milestone 6: EXTERNAL_LINK_ATTRS 與 row icon map（B3）

- **技術決策**：
  - 建 `app/utils/published-products/resource-row-attrs.ts`（純資料常數檔，不 import runtime-only 邏輯，build-time 與 runtime 皆可 import——比照 M2 `taxonomy-kinds.ts` 風格）：`EXTERNAL_LINK_ATTRS = { target: '_blank', rel: 'noopener noreferrer' } as const`、`RESOURCE_ROW_ICONS = { guide, link } as const satisfies Partial<Record<CompactResourceRow['type'], string>>`。
  - `resource-rows.ts`（runtime）三處收斂：`getResourceRowLinkAttributes` external 分支、`mapSearchSuggestionToRow`（`...(result.external ? EXTERNAL_LINK_ATTRS : { target: null, rel: null })`）、`getSearchSuggestionIcon`（guard clause：product→null，其餘→`RESOURCE_ROW_ICONS[type]`）。`map-resource-rows.ts`（build-time）：`mapLinkToRow` spread、`mapGuideToRow` icon 改 map；`mapLinkToRow` 的 `icon: link.icon` 資料驅動維持不動（非 type→icon）。
- **問題與解法**：主體由平行 developer 完成，但 `mapSearchSuggestionToRow`（plan B3 明列 `resource-rows.ts:48-49`，該字面第三次出現）初版漏收；coordinator 派 follow-up 補齊並同步守門。`nuxt-smoke.test.ts` 兩處守門重新指向：外部安全屬性字面改守 `resource-row-attrs.ts`、並斷言 `resource-rows.ts` 消費 `EXTERNAL_LINK_ATTRS`；`mapSearchSuggestionToRow` 條件式守門改對新形式。行為等價由 `resource-rows.test.ts`／`map-resource-rows.test.ts` 輸出值斷言守住。
- **測試結果**：`vitest run --exclude 'tests/e2e/**'`（host）82 files / 629 passed；`eslint` exit 0。新增 `resource-row-attrs.test.ts`。

## Milestone 7: 命名常數收斂（C2 + C3）

- **技術決策**：
  - C2：`client-search.ts` 的 `getClientSearchSuggestions` 預設上限 `12` 抽為 module 私有 `SEARCH_SUGGESTION_LIMIT`，加註解與同檔 `SEARCH_HISTORY_LIMIT`（數值巧合、語意不同）分離。既有 `client-search.test.ts` 透過 default 行為守上限，未 export（YAGNI）。
  - C3：`search-input.vue` 的 `event.keyCode === 229` 抽為 `<script setup>` 頂層 `IME_COMPOSITION_KEYCODE = 229` 具名常數＋why 註解（IME 組字 legacy keyCode，配合 `event.isComposing` 擋組字中誤送出）；只用一次不跨檔共用。
- **問題與解法**：keyCode guard 難純行為單測（happy-dom 無法可靠模擬 `event.keyCode`），比照專案既有 source-grep 慣例在 `search-input-component.test.ts` 新增斷言：具名常數存在、guard 引用它、無裸 `229`。
- **測試結果**：`vitest run --exclude 'tests/e2e/**'`（host）82 files / 629 passed；`eslint` exit 0。

## Cross Review 收斂（M4–M7，ultracode fan-out）

- **流程**：Workflow 5 維度平行審（correctness／types／reuse-ddd／style／test-integrity）× 逐 finding adversarial verify（reviewer 嘗試反駁、預設懷疑），範圍 `e23b91d..HEAD`（M4/M5/M6/M7 四 commit）。types 維度特別補位——本機無法跑 `tsc`，由 reviewer 讀碼推理 `typeof`／`as const` spread／`satisfies` 的健全性。
- **結論**：5 維度共 1 個 confirmed finding（severity low，**不擋 merge**），其餘無 finding／假陽性。confirmed 非 code bug，是 **spec/docs 認知落差**：AC15/ADR-3 宣稱的「窄螢幕底部 tab 順序 `search/links`→`links/search`」user-visible 變更**實際未發生**——渲染源 `nav_items` 舊版本即 `links/search`；被重排的 `COMPACT_APP_TABS` 經 `getCompactAppView().tabs` 暴露但無 template 消費（死路徑）。coordinator 獨立驗證（`rg` 全 codebase 無 `.tabs` 消費、`git show e23b91d` 確認舊 `nav_items` 順序）後：**不改 production code**（渲染正確等價）、**不清死路徑**（031.x 遺留，屬 032 範圍外），據實校正 spec AC15／ADR-3 與本 works。
- **測試結果**：`vitest run --exclude 'tests/e2e/**'`（host）82 files / 629 passed；`eslint` exit 0。

## AC19 整體 quality gate — 交接狀態

- **host 已完成**：`pnpm test`（vitest，82 files／629 綠）、`eslint`（exit 0）於各 milestone 與整合後皆全綠。
- **待使用者以 Docker／CI 收尾（本機容器未啟動、無法開 `toybox.local`，見 MEMORY）**：
  1. `./dev.sh exec ./dev.sh verify`（補 `typecheck`＋`generate`，涵蓋 M3 error.vue 套 `<NuxtLayout>` 的 SSG 建置，以及 M5/M6 的型別等價替換）。
  2. 開頁巡檢：taxonomy 頁（四 kind）、detail 頁、首頁分類 active 高亮／導向、導覽列（桌面 sidebar／窄螢幕 rail＋底部 tab）渲染與點擊。**AC15 已確認無可見變更**，導覽視覺回歸風險為零；重點放在 M3 的錯誤頁三情境（見上方 M3 段）與首頁分類 active。
- **未 push／未開 PR**：所有變更僅 local commit（M3–M7 各一 commit，接續既有 M1/M2），推送與開 PR 留待使用者授權。
