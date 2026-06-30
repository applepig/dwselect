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
