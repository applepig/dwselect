# 032 Code Health：去重與 magic string 收斂

## 目標

把 031 sprint 期間 reviewer 找出、刻意排除在 031 外的 production code 重複與 magic string，收斂成單一真相，降低公開站最容易出 SEO 回歸的維護負擔。具體交付三條主軸 + 一組低成本 clean-code：

1. **SEO meta 單一真相**：抽 `buildSeoMeta` 純函式，收斂散落 10+ 頁的 `useSeoMeta` 12 欄樣板（含 og/twitter、`summary_large_image`）。
2. **Taxonomy 種類單一真相**：建 `TAXONOMY_KINDS` 設定表（prefix／404 message／label getter），並抽 `useTaxonomyDetailPage` composable 收斂四個逐行複製的 taxonomy 頁。
3. **Magic string 收斂**：`'all'` sentinel、導覽分頁設定、外部連結屬性、IME keyCode、search suggestion 上限改為命名常數／單一設定。

完成後 SEO meta／canonical／404／導覽設定改一處不再需要同步改多檔。

## 非目標

- **不收斂 taxonomy 的 namespace／selection domain 邏輯**：`isSelectorIdInNamespace`（`build-taxonomy-page-data.ts:57`）、`selectPublishedTaxonomyItems`、`resolveDescription` 編碼的是 ADR-10／ADR-6 的真實 domain 差異（brand/tag namespace 互斥防呆、各 kind 的 id 欄位差異、只有 tag/brand 有 description），**不收進 `TAXONOMY_KINDS` 表**。A4 只做「砍半」版。
- **不抽 A2 detail 頁的獨立 composable**：products/guide 兩個 detail 頁的 SEO 重複交給 `buildSeoMeta` helper 吸收，剩餘 canonical/title/404 scaffolding 保持 inline（只 2 處，未達 rule of three）。
- **不抽 Vue SEO 元件**：保留頁面 setup 內 `useHead(...)`／`useSeoMeta(...)` 的字面呼叫，守住 SSG prerender 的 head 註冊時機與既有 source-grep 測試。
- **不做 C5**（`getSearchResultSections`）：031 已改用 `Map<type, section>`，殘留的 `sections[0]!` order coupling 價值極低，本 sprint 不處理。
- **不改 taxonomy／detail 頁的可見內容與行為**（除 B2 導覽順序統一外）：純去重，輸出 HTML／meta 應與重構前等價。

## User Story

作為 DW嚴選的維護者，我想要 taxonomy 頁、SEO meta、導覽設定與各處 magic string 各有單一真相，以便改 SEO／canonical／404／導覽時只改一處、不再因漏改某一檔造成公開站 SEO 或導覽行為分歧。

### 驗收條件

**A3／A2 — SEO meta helper**
- [x] AC1：新增 `buildSeoMeta(input)` 純函式於 `app/utils/seo-metadata.ts`，回傳可直接餵給 `useSeoMeta` 的 object（鋪好 `title`/`ogTitle`/`twitterTitle`、`description`/`ogDescription`/`twitterDescription`、`ogUrl`、`ogImage`/`twitterImage`、固定 `twitterCard: 'summary_large_image'`，及 optional `ogImageAlt`/`twitterImageAlt`）。
- [x] AC2：`buildSeoMeta` 支援 reactive 入參（`Ref`／getter），使 detail 頁的 computed title/description/og image 與 taxonomy 頁的 computed 皆可套用，輸出仍維持 reactivity。
- [x] AC3：9 個頁面改用 `buildSeoMeta`、刪除逐字複製的 12 欄區塊——6 個動態頁（`products/[id].vue`、`guide/[id].vue`、四個 taxonomy 頁）+ 3 個靜態頁（`guide/index.vue`、`links.vue`、`search.vue`）。**例外：`index.vue` 不套用**——該頁刻意 `title: SITE_TITLE`（長）≠ `ogTitle: SITE_NAME`（短品牌名），而 `buildSeoMeta` 契約是把單一 `title` collapse 到 og/twitter title，套用會改變 og:title 輸出（違反非目標「meta 等價」並破 `launch-seo.test.ts:51` 守門）。`app.vue`（app shell，非頁面）同理本就不在範圍。不為此加 `ogTitle` override（YAGNI／逾 ADR-1 契約）。
- [x] AC4：頁面 setup 仍保留字面 `useHead(...)` 與 `useSeoMeta(buildSeoMeta(...))` 呼叫，且位於任何 `await ...Data(...)` 之前；`tests/nuxt-smoke.test.ts:656`（head-before-await）與既有 source-grep 斷言維持綠燈不需放寬。
- [x] AC5：`buildSeoMeta` 有單元測試覆蓋：靜態 image（taxonomy 頁路徑，無 imageAlt）與動態 image+imageAlt（detail 頁路徑）兩種輸入，斷言鋪開後各欄位值正確、`twitterCard` 固定。

**A4-lite — TAXONOMY_KINDS 表**
- [ ] AC6：新增單一 `TAXONOMY_KINDS` 設定（kind → `{ prefix, notFoundMessage, getLabel }`），涵蓋 `category`/`tag`/`brand`/`channel`。
- [ ] AC7：`resolve-breadcrumb-items.ts` 的 `resolveTaxonomyLabel`、`build-taxonomy-page-data.ts` 的 `resolveLabel`、四個 taxonomy 頁的 canonical prefix 與 404 message，全部改從 `TAXONOMY_KINDS` 取值，移除各自硬寫的 prefix 字串與 label getter if 鏈。
- [ ] AC8：`isSelectorIdInNamespace`、`resolveDescription`、`selectPublishedTaxonomyItems` 維持原樣不被表驅動化；既有 `build-taxonomy-page-data` 的 `/tag/{brand-id}`／`/brand/{tag-id}`／未知 id → 404 測試全數維持綠燈。

**A1／C1 — taxonomy 頁 composable**
- [ ] AC9：新增 `useTaxonomyDetailPage(kind)` composable，封裝 route id 正規化（吸收 C1）、canonical 推導、meta title/description computed、`useHead`/`useSeoMeta`、`await useTaxonomyPageData`、404、`watchEffect`，回傳 `{ page_data }`。
- [ ] AC10：四個 taxonomy 頁（`category`/`tag`/`brand`/`channel` `[id].vue`）改用該 composable，script 只剩 kind 與 template；`category/[id].vue` 的 `<CategoryChipBar />` + `compact-page` wrapper template 差異保留。
- [ ] AC11：新增 composable 的測試守住 head-before-await 不變式（composable 內 `useHead`／`useSeoMeta` 註冊早於 `await`），等價於 detail 頁既有的 source-grep 守門；四個 taxonomy 頁的 404／canonical／meta 行為與重構前等價。

**B1／C4 — ALL_CATEGORIES_ID**
- [ ] AC12：新增 `ALL_CATEGORIES_ID = 'all'` 常數，所有 runtime 比較與 chip 產生（`build-navigation.ts`、`selectable-category-ids.ts`、`compact-app.ts`、`app-navigation.vue`、`category-chip-bar.vue`）改引用該常數，不再裸寫 `'all'`。
- [ ] AC13：型別維持 union，但 `'all'` literal 以 `typeof ALL_CATEGORIES_ID` 對齊；`types.ts`／`compact-app.ts` 手寫的 `Product['category_id'] | 'all'` 改引用既有 `CategoryChipView['id']`（C4）。

**B2 — 導覽 SSOT**
- [ ] AC14：建單一導覽 tab 設定為 SSOT，`COMPACT_APP_TABS` 與 `app-navigation.vue` 的 `nav_items` 由它衍生，label／icon／順序不再各寫一份。
- [ ] AC15：統一順序為 `home / guide / links / search`（桌面導覽為基準）；窄螢幕底部 tab 順序由 `search/links` 改為 `links/search`，此 user-visible 變更經 e2e／視覺確認。

**B3 — 外部連結屬性 / row icon**
- [ ] AC16：新增 `EXTERNAL_LINK_ATTRS`（`{ target: '_blank', rel: 'noopener noreferrer' }`）常數，`resource-rows.ts` 與 `scripts/public-payload/map-resource-rows.ts` 的外部連結屬性改引用；row type→icon（`guide: i-lucide-book-open`、`link: i-lucide-link`）改用單一 map。

**C2／C3 — 命名常數**
- [ ] AC17：`client-search.ts` 的 suggestion 上限 `12` 抽為 `SEARCH_SUGGESTION_LIMIT`（與 `SEARCH_HISTORY_LIMIT` 語意分離）。
- [ ] AC18：`search-input.vue:74` 的 `event.keyCode === 229` 改用 `IME_COMPOSITION_KEYCODE = 229` 具名常數（或加 why 註解說明 IME 組字）。

**整體 quality gate**
- [ ] AC19：`./dev.sh exec ./dev.sh verify`（test→lint→typecheck→generate）全綠；公開站頁面實際開過，taxonomy 頁、detail 頁、首頁、導覽行為無可見回歸。

## 相關檔案

- `app/utils/seo-metadata.ts` — SEO 常數 SSOT，`buildSeoMeta` 新增於此
- `app/utils/published-products/taxonomy-page-seo.ts` — 既有 `buildTaxonomyPageSeo`（算值），與 `buildSeoMeta`（組 payload）協作
- `app/pages/products/[id].vue`、`guide/[id].vue` — detail 頁 SEO 套用 `buildSeoMeta`
- `app/pages/category/[id].vue`、`tag/[id].vue`、`brand/[id].vue`、`channel/[id].vue` — taxonomy 頁改用 composable
- `app/pages/index.vue`、`guide/index.vue`、`links.vue`、`search.vue` — 靜態頁 SEO meta 套用 `buildSeoMeta`
- `app/utils/breadcrumb/resolve-breadcrumb-items.ts` — `TAXONOMY_PREFIXES`/`resolveTaxonomyLabel` 改從 `TAXONOMY_KINDS`
- `app/utils/published-products/build-taxonomy-page-data.ts` — `resolveLabel` 改從表；`isSelectorIdInNamespace`/`resolveDescription` 不動
- `app/utils/published-products/select-taxonomy-items.ts` — `TaxonomyKind` 型別來源，`TAXONOMY_KINDS` 表 key 對齊
- `app/utils/published-products/compact-app.ts`、`app/components/app-navigation.vue` — 導覽 SSOT、`'all'` 常數
- `app/components/category-chip-bar.vue`、`app/utils/published-products/build-navigation.ts`、`app/utils/published-products/selectable-category-ids.ts` — `'all'` 常數
- `app/utils/public-content-view-types.ts`、`app/utils/published-products/types.ts` — `CategoryChipView['id']` 引用、`'all'` union
- `app/utils/published-products/resource-rows.ts`、`scripts/public-payload/map-resource-rows.ts` — `EXTERNAL_LINK_ATTRS`、icon map
- `app/utils/search/client-search.ts`、`app/components/search/search-input.vue` — `SEARCH_SUGGESTION_LIMIT`、`IME_COMPOSITION_KEYCODE`
- `tests/nuxt-smoke.test.ts` — head-before-await／source-grep guardrail（套用後須維持綠燈）

## 既有資產盤點 / Reuse Map

| 既有資產 | 位置 | 本次如何沿用 |
|---|---|---|
| `getCanonicalUrl`／`getOgImageUrl`／`getSeoDescription`／`SITE_OG_IMAGE`／`SITE_NAME` | `app/utils/seo-metadata.ts` | 沿用；`buildSeoMeta` 建在同檔，組裝時呼叫這些既有 helper，不另造 |
| `buildTaxonomyPageSeo`（算 title/description/canonical/og_image 值） | `app/utils/published-products/taxonomy-page-seo.ts` | 分層協作：taxonomy 頁先用它算值，再餵 `buildSeoMeta` 組 `useSeoMeta` payload；不重疊 |
| `TAXONOMY_PREFIXES` 常數、`resolveTaxonomyLabel`（prefix→labelGetter） | `app/utils/breadcrumb/resolve-breadcrumb-items.ts:31,122` | 由 `TAXONOMY_KINDS` 表取代散落的 prefix 與 labelGetter if 鏈，breadcrumb 改從表取 |
| `resolveLabel`（kind→labelGetter） | `app/utils/published-products/build-taxonomy-page-data.ts:88` | 改從 `TAXONOMY_KINDS` 取 labelGetter |
| `isSelectorIdInNamespace`、`resolveDescription`、`selectPublishedTaxonomyItems` | `build-taxonomy-page-data.ts:57,105`、`select-taxonomy-items.ts` | **不動**——ADR-10/ADR-6 domain guard，明確排除於表外 |
| `createTaxonomyLabelResolver`、`TaxonomyKind` 型別 | `app/utils/content/taxonomy-labels.ts`、`select-taxonomy-items.ts` | 沿用作為 `TAXONOMY_KINDS` 的 getLabel 簽章與 key 型別 |
| `useTaxonomyPageData`（既有 fetch composable） | `app/composables/` | `useTaxonomyDetailPage` 內部呼叫，不取代 |
| `CategoryChipView['id']`（= `Product['category_id'] \| 'all'`） | `app/utils/public-content-view-types.ts:72` | C4 改引用它取代手寫 union |
| `CompactAppTab` 型別、`COMPACT_APP_TABS` | `app/utils/published-products/compact-app.ts` | 導覽 SSOT 以含 `to` 的 tab 設定為單一來源，`COMPACT_APP_TABS` 由它衍生 |
| `catalog-pill.vue`、`--dw-*` token | `app/components/`、`app/assets/styles/variables.css` | 本 sprint 不新增視覺元件；若觸及樣式一律走 token |
| nuxt-smoke head-before-await／source-grep 斷言 | `tests/nuxt-smoke.test.ts:201,419,656` | 作為 SSG prerender SEO 不變式的守門，重構後須維持綠燈，並為 composable 補等價斷言 |

新建項目：`buildSeoMeta`（seo-metadata.ts）、`TAXONOMY_KINDS`（select-taxonomy-items 或 taxonomy helper 同層）、`useTaxonomyDetailPage`（composable）、`ALL_CATEGORIES_ID`、`EXTERNAL_LINK_ATTRS`+icon map、`SEARCH_SUGGESTION_LIMIT`、`IME_COMPOSITION_KEYCODE`。皆為收斂既有重複而建，非新功能。

## 介面/資料結構

非 API sprint（公開靜態站，無 runtime 通訊協定變更）。核心新介面：

```ts
// app/utils/seo-metadata.ts —— 純函式，回傳 useSeoMeta input object
type SeoMetaInput = {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  url: MaybeRefOrGetter<string>
  image: MaybeRefOrGetter<string>
  imageAlt?: MaybeRefOrGetter<string>   // detail 頁有；taxonomy／靜態頁省略
}
function buildSeoMeta(input: SeoMetaInput): Parameters<typeof useSeoMeta>[0]
// 鋪開：title→title/ogTitle/twitterTitle；description→.../ogDescription/twitterDescription；
// url→ogUrl；image→ogImage/twitterImage；imageAlt→ogImageAlt/twitterImageAlt（有才加）；
// 固定 twitterCard: 'summary_large_image'

// TAXONOMY_KINDS —— kind 為 key 的設定表
type TaxonomyKindConfig = {
  prefix: string                  // 例 '/category/'
  notFoundMessage: string         // 例 '找不到分類'
  getLabel: (labels: ReturnType<typeof createTaxonomyLabelResolver>, id: string) => string
}
const TAXONOMY_KINDS: Record<TaxonomyKind, TaxonomyKindConfig>
// breadcrumb 持 prefix → 反查 kind（或表附 prefix→kind map）；build／page 持 kind 直接取

// useTaxonomyDetailPage —— 封裝四頁共用 setup
function useTaxonomyDetailPage(kind: TaxonomyKind): { page_data: ShallowRef<TaxonomyPageData | null> }
```

`useSeoMeta` 接受 reactive 值；`buildSeoMeta` 將同一 ref 鋪到多欄不破壞 reactivity。頁面寫法維持 `useHead(() => ({...}))` 與 `useSeoMeta(buildSeoMeta({...}))`，呼叫位置在 `await` 之前。

## 邊界案例

- **跨 namespace 直連**（`/tag/{brand-id}`、`/brand/{tag-id}`）：`useTaxonomyDetailPage` 經 `useTaxonomyPageData`→`buildTaxonomyPageData` 仍須命中 `isSelectorIdInNamespace` 回 null → 丟 404。composable 不得繞過此 guard。
- **taxonomy id 不存在 / 三型別全空**：composable 須維持「`page_data === null` → `createError(404)`」，404 message 取自 `TAXONOMY_KINDS[kind].notFoundMessage`。
- **detail 頁動態 og:image vs taxonomy／靜態頁靜態 og:image**：`buildSeoMeta` 的 `image` 入參兩種來源都要支援；`imageAlt` 為 optional，taxonomy／靜態頁不傳時輸出不含 `ogImageAlt`/`twitterImageAlt`（與現況一致）。
- **canonical 在 fetch 前已知 vs detail 頁 computed fallback**：taxonomy 頁 canonical 由 route id 同步推導（fetch 前）；detail 頁 canonical 是 computed（`null` 時 fallback `/` 或 `/guide`）。composable／helper 不可把 detail 的 computed fallback 套到 taxonomy 頁，反之亦然。
- **`category/[id].vue` 的 template 差異**：composable 只吞 script 邏輯，`<CategoryChipBar />` + `compact-page` wrapper 保留在 category 頁 template，不被 composable 吃掉。
- **窄螢幕 tab 順序變更**：B2 統一後窄螢幕底部 tab 從 `search/links` 變 `links/search`，須 e2e／視覺確認底部導覽未錯位、active 判定正確。
- **`'all'` 常數化後的 active 判定**：`category-chip-bar.vue` 與 `app-navigation.vue` 用 `'all'` 判首頁 active，改常數後 active 高亮行為須不變。
- **B3 跨 build-time/runtime 邊界**：`EXTERNAL_LINK_ATTRS` 須放兩邊都 import 得到的位置；`scripts/public-payload`（build-time）import `app/utils` 的純資料常數可接受，但不得讓 build-time mapper 反向依賴 runtime-only 邏輯。

## ADR

### ADR-1：SEO meta 用純函式 helper，不抽 composable／Vue 元件
- 決策：`buildSeoMeta` 只回傳 `useSeoMeta` 的 input object；`useHead(...)`／`useSeoMeta(...)` 呼叫仍寫在頁面 setup、`await` 之前。
- 原因：`tests/nuxt-smoke.test.ts:656` 以 source-grep 斷言 `products/[id].vue` 原始碼含 `useHead(` 且早於 `await ...Data`，守 SSG prerender 時 head（canonical/og）先註冊、prerendered HTML 不漏 meta 的 SEO 不變式。純函式只搬「組 object」邏輯，呼叫字面與順序不變，測試與 prerender 行為皆不受影響。
- 替代方案：(a) 抽 composable 內部呼 `useHead`——頁面失去 `useHead(` 字面、破測試，且 head 註冊時機移入 composable 較難守 prerender 順序；(b) 抽 `<SeoHead>` Vue 元件——head 註冊移到子元件 setup，prerender 順序保證弱化，SEO 回歸風險最高。皆否決。

### ADR-2：TAXONOMY_KINDS 只收斂 prefix／404／labelGetter，排除 namespace/select/description
- 決策：表只含 `{ prefix, notFoundMessage, getLabel }`；`isSelectorIdInNamespace`、`resolveDescription`、`selectPublishedTaxonomyItems` 留原處不表驅動化。
- 原因：`isSelectorIdInNamespace`（027 ADR-10 強化）是擋 `/tag/{brand-id}` 跨 namespace 直連的 correctness-critical guard，且各 kind 的 id 欄位（`category_id` 單數 vs `channel_ids`/`tag_ids` 複數）、description 有無（只 tag/brand 有）是真實 domain 差異。硬塞進 flat table 會把這些防呆與差異藏進查表，重構中易弄丟，違反「避免過早抽象」。可安全收斂的只有「一一對應的字串／getter 映射」。
- 替代方案：全表驅動（backlog 原案）——掩蓋 ADR-10 guard，否決。

### ADR-3：導覽統一順序為 home/guide/links/search（桌面為基準）
- 決策：以桌面 `nav_items` 順序為 SSOT，窄螢幕底部 tab 順序隨之由 `search/links` 改為 `links/search`。
- 原因：兩處順序原本不一致是隱性 drift；統一需擇一基準，桌面導覽已是 `home/guide/links/search`，以其為準改動面最小（只動窄螢幕一處可見順序），使用者已確認接受此 user-visible 變更。
- 替代方案：以窄螢幕順序為基準（改桌面）／維持兩份不統一——前者改動桌面可見順序、後者放棄 SSOT 收斂，皆否決。

## Milestones

> 依 reviewer 建議的依賴順序：SEO helper（零路由副作用）→ TAXONOMY_KINDS 表（composable 前提）→ taxonomy composable → 其餘獨立去重。每個 milestone 為可獨立 commit／review 的去重單元，皆走 Red → Green → Refactor。

### Milestone 1: buildSeoMeta SEO meta helper（A3 + A2）
> 範圍：`app/utils/seo-metadata.ts`（新增 `buildSeoMeta` + 測試）、6 個 `useSeoMeta` 頁面 + 至多 4 個靜態頁套用
> 驗證：新增 `buildSeoMeta` 單元測試（靜態/動態 image 兩路徑）；`pnpm test` 綠；`nuxt-smoke` head-before-await 與 source-grep 維持綠
> 預期結果：12 欄 `useSeoMeta` 樣板收斂為單一 helper 呼叫，detail 頁的 `ogImageAlt`/`twitterImageAlt` 由 optional 參數覆蓋

- [x] Red → Green → Refactor

### Milestone 2: TAXONOMY_KINDS 設定表（A4-lite）
> 範圍：新增 `TAXONOMY_KINDS`；`resolve-breadcrumb-items.ts`、`build-taxonomy-page-data.ts` 的 label getter、四 taxonomy 頁的 prefix/404 改從表取
> 驗證：`build-taxonomy-page-data` 既有 `/tag/{brand}`/`/brand/{tag}`/未知 id → 404 測試維持綠；breadcrumb label 測試維持綠
> 預期結果：kind→prefix/404/labelGetter 單一真相；`isSelectorIdInNamespace`/`resolveDescription` 原封不動

- [ ] Red → Green → Refactor

### Milestone 3: useTaxonomyDetailPage composable（A1 + C1）
> 範圍：新增 `useTaxonomyDetailPage` composable + 測試；四 taxonomy 頁改用，吸收 route id 正規化
> 驗證：composable 新增 head-before-await 等價測試；四頁 404/canonical/meta 行為等價（既有 e2e/單元維持綠）
> 預期結果：四頁 script 收斂為 kind + composable 呼叫，`category` 頁 template 差異保留

- [ ] Red → Green → Refactor

### Milestone 4: 導覽 SSOT 與順序統一（B2）
> 範圍：建單一 tab 設定 SSOT，`COMPACT_APP_TABS`/`nav_items` 由它衍生，統一順序 home/guide/links/search
> 驗證：導覽相關單元測試；e2e/視覺確認窄螢幕底部 tab 順序變更後無錯位、active 正確
> 預期結果：導覽 label/icon/順序單一真相，窄螢幕 tab 順序改為 links/search

- [ ] Red → Green → Refactor

### Milestone 5: ALL_CATEGORIES_ID 常數與型別對齊（B1 + C4）
> 範圍：新增 `ALL_CATEGORIES_ID`；`build-navigation`/`selectable-category-ids`/`compact-app`/`app-navigation.vue`/`category-chip-bar.vue` 改引用；`types.ts`/`compact-app.ts` 的手寫 union 改引用 `CategoryChipView['id']`
> 驗證：navigation/chip 相關單元測試；首頁 active 判定 e2e/視覺確認
> 預期結果：`'all'` 不再裸寫，型別 union 以常數 literal 對齊

- [ ] Red → Green → Refactor

### Milestone 6: EXTERNAL_LINK_ATTRS 與 row icon map（B3）
> 範圍：新增 `EXTERNAL_LINK_ATTRS` 常數 + row type→icon map；`resource-rows.ts`、`scripts/public-payload/map-resource-rows.ts` 改引用
> 驗證：`pnpm content:check`/payload 相關測試維持綠；確認 build-time 與 runtime 輸出的 target/rel/icon 一致
> 預期結果：外部連結三件組與 icon 字面值單一真相，跨 build/runtime 邊界一致

- [ ] Red → Green → Refactor

### Milestone 7: 命名常數收斂（C2 + C3）
> 範圍：`client-search.ts` 抽 `SEARCH_SUGGESTION_LIMIT`；`search-input.vue` 抽 `IME_COMPOSITION_KEYCODE`（或加 why 註解）
> 驗證：`pnpm test`/search 相關測試維持綠
> 預期結果：兩個 magic number 具名，語意與 `SEARCH_HISTORY_LIMIT` 分離

- [ ] Red → Green → Refactor
