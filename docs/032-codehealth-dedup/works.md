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
