# 027 分類／標籤瀏覽頁 + slug 結構鋪路

> 狀態：✅ M1–M5 實作完成（M5 含 Codex adversarial review 修復、AC1c ASCII gate、移除 deprecated Google Sheet importer，2026-06-25），本機 `pnpm test`（512 passed）／`pnpm lint` 全綠，待 Docker gate（typecheck/content:check/generate）與 Frontend handoff（AC25）。修訂歷程：依 ddd-reviewer findings 補強 payload id 化、tag/category description、guide-detail 導向、sitemap、404 機制、AC 重編號 1–19；**2026-06-24 變更：brand 由 `/tag/{brand}` 改走專屬 `/brand/{id}`、新增 `/channel/{id}`，三者共用同一 taxonomy 頁 handler 的「alias mode」（ADR-8 改寫、新增 ADR-9/10、F 區 AC20–AC25）；channel 成員欄位由誤植的 `purchase_links` 更正為實際 schema 的 `offers`**。
> **2026-06-25 變更（code-review 揪出）：content id（product／guide／link）強制 ASCII kebab、唯一 CJK guide id `2026-06-02-日本米入門篇` 遷移為 `2026-06-02-japanese-rice-intro`，從源頭根除「CJK 進 route stem」造成的 breadcrumb 編碼脆弱性；部分推翻 ADR-4「不改 URL」（見 ADR-11、AC1c），該篇公開 URL 隨之變更、經使用者確認不做 redirect。**
> 建立日期：2026-06-23
> 分支：`027-taxonomy-pages-slug`（自 `026-detail-pages` HEAD 開出）

## 背景

026 補完了 product／guide 的 detail 頁，但在過程中浮現幾個「該做而沒做」的結構缺口，本 sprint 一次補上：

1. **沒有獨立的分類／標籤瀏覽頁**：目前「依分類瀏覽」其實是首頁掛 query（`/?category=computer-3c`，`index.vue` + `getCompactAppStateFromRoute`），不是獨立 URL，**對 SEO 不可索引、不可單獨分享**。標籤更糟——根本沒有對應頁面。
2. **taxonomy 導向不對稱且脆弱**：detail 頁的 category pill 帶 **id** 導向 `/?category=<id>`（精準），但 tag pill 卻是拿 **label 文字**去打 `/search?q=<label>`（`product-detail.vue:59`，模糊全文搜尋）。標籤點擊走的是「文字搜尋」而非「精準導到該標籤」。
3. **id 與 slug 混雜**：product／guide／link 的公開 URL 直接用日期前綴的檔名 id（`/products/2026-06-02-adata-power-bank`），沒有「內部 id」與「對外 slug」的分離。效法 WordPress 的 id + slug 機制，先把結構鋪好。

三者共同主題是「taxonomy 導覽與識別碼整潔」。

### 現況事實（已調查確認）

- **路由 / SSG**：`build-product-routes.ts`、`build-guide-routes.ts` 各自掃 content 資料夾、過濾 published、由檔名 stem 產生 `/products/{id}`、`/guide/{id}`，併入 `nuxt.config` `prerender.routes`。**無 category／tag 路由**。
- **taxonomy 覆蓋三型別**：category — product 用單數 `category_id`、guide／link 用 `category_ids[]`；tag — 三者皆 `tag_ids[]`。所以一個 category 或 tag 可同時關聯 products、guides、links。
- **schema 現況**：`product_schema`／`guide_schema`／`link_schema` 皆 `.strict()`，且**都沒有 `slug` 欄位**（product 用 `name`／單數 `category_id`）。taxonomy 定義（categories／tags）的 `id` 本身已是乾淨 slug（`computer-3c`、`ergonomic`）。
- **既有 list 元件**：商品卡片用 `ProductCard` + `.product-grid`（首頁）；guide／link row 用 `ResourceList`（`app/components/resource-list.vue`，search 結果與 guide 列表都用它）；`getSearchResultSections` 已把搜尋結果分成 產品／指南／連結 三區。
- **既有 nav 邏輯**：`buildNavigation` 已用 published product 算 category count，並過濾 `count > 0`。
- **既有 pill**：`catalog-pill.vue` 已支援 `to`（NuxtLink），只需改導向目標。
- **public payload 只帶 label、不帶 id（review 揪出）**：`ProductDetailView`／`GuideDetailView`（`app/utils/public-content-view-types.ts`）只有 `tag_labels`（guide 連 category 也只有 `category_labels`）；mapper（`map-product-card-fields.ts`、`map-guide-detail.ts`）把 `tag_ids.map(getTagLabel)` 轉 label 後**丟棄 id**。故「tag pill 帶 id 導 `/tag/{id}`」在現狀拿不到 id，需先擴充 view type 與 mapper 攜帶 tag id。**這是程式（payload 管線）改動，不是補 content 資料。**
- **熱門標籤 chip 以 label 計數、無 id（review 揪出）**：`build-navigation.ts` 的 `addKnownTagCounts` **以 label 當 Map key**，`CompactTagChip`（`app/utils/published-products/types.ts`）為 `{ label, count, active }`、**無 id**。故熱門 chip 深連 `/tag/{id}` 需改為以 tag id 計數並讓 chip 攜帶 id。
- **category 沒有 description（review 揪出）**：`category_definition_schema`（`app/utils/product-schema.ts`）無 `description` 欄位、`categories.json` 也無此資料；只有 `tag_definition_schema`／`tags.json` 有 description。`createTaxonomyLabelResolver`（`taxonomy-labels.ts`）**只有 label getter、無 description getter**。
- **guide detail 的 pill 也壞且更不對稱（review 揪出）**：`app/components/guide-detail.vue` 的 category pill 與 tag pill **兩個都**走 `/search?q=<label>` 文字搜尋（連 category 帶 id 都沒做到），與 product detail 同屬點 3 要修的範圍。
- **sitemap 生成方式**：`scripts/build-public-discovery.ts` 在 `pnpm generate` 前產生 `sitemap.xml`，內容為 `ROOT_ROUTES`（`/`、`/guide`、`/search`、`/links`）＋ product detail entries。新 taxonomy 路由要真正「可索引」需在此腳本加入 taxonomy entries。

## 目標

1. 新增獨立、可 prerender、可索引、可分享的 `/category/{id}`、`/tag/{id}`、`/brand/{id}`、`/channel/{id}` 瀏覽頁，後三者由同一套 taxonomy 頁 handler 以 alias mode 驅動（ADR-10）。
2. taxonomy 頁以「每型別一個 list 元件」的方式組合呈現：商品用 `ProductCard` grid，指南／連結用 `ResourceList`；頁面依該 taxonomy 實際有的型別決定 include 哪幾段，空的型別不顯示。
3. 修正 taxonomy 導向：**product 與 guide 兩個 detail 頁**的 category pill → `/category/{id}`、tag pill → `/tag/{id}`（精準帶 id），消除「tag（及 guide 的 category）走 label 文字搜尋」的不對稱；search idle 的熱門標籤 chip 也深連到 `/tag/{id}`。此目標的前置是先讓 detail view／popular-tags payload 攜帶 taxonomy id（見「現況事實」payload 條目），故 id 化 payload 與導向消歧同屬一條工作線。
4. 在 product／guide／link schema 新增 `slug` 欄位，程式化把所有 content JSON 的 `slug` 種成 = 目前的 `id`（兩欄先同值），建立 id ↔ slug 的結構分離。**本 sprint 不改任何公開 URL、不導轉**。

## 非目標

- **不改既有公開 URL、不做 redirect**：product／guide／link 的網址維持用 id；slug 純結構鋪路。「URL 最終用 id 還是 slug」留待後續 sprint 討論決定（屆時才動 canonical 與 `_redirects`）。見 ADR-4。
- **不做全站 typed unique id registry**：點 4 只做 slug ↔ id 結構分離，不建立 `tag:xxx`／`product:xxx` 之類的全站統一識別空間。
- **不把 taxonomy 變成搜尋結果實體**：搜尋「電腦3C」不會回傳 category 頁作為一筆結果（WP 那種 term-in-search）；point 3 只處理「既有 tag／category 導向帶對 id 到對的頁」。YAGNI，未來再評估。
- **不動首頁 `?category=` 快速篩選**：首頁分類 chip 維持原地過濾 UX（不退化）；dedicated `/category/{id}` 是另一條「可分享、可索引」的正規入口。見 ADR-3。
- **~~不為 channel 開瀏覽頁~~（修訂 2026-06-24）**：原排除 channel 頁，現納入範圍——見下方 brand/channel alias 修訂與 ADR-9。
- **brand／channel alias 頁（修訂 2026-06-24）**：brand 與 channel 本質上都由「同一套 taxonomy 頁 handler」服務，只是 URL 前綴不同的 **alias mode**（ADR-10）。經使用者確認：
  - **brand 改走專屬 `/brand/{id}`**（不再用 `/tag/{brand}`）：brand 與 tag 雖共用 `tag_ids` namespace、membership predicate 完全相同，但對外網址獨立為 `/brand/` 前綴，canonical = `/brand/{id}`。route builder 把 `tag_ids` 依 `brands.json` 切分：屬 brand 的 id → `/brand/`，其餘 → `/tag/`（兩 namespace 互斥）。label/description fallback 到 `brands.json`（ADR-8 改寫）。
  - **新增 `/channel/{id}`**：channel 成員資格來自 `offers[].channel_id`（**只適用 products**，guide/link 無購買連結），canonical = `/channel/{id}`，label 取自 `channels.json`（**無 description**，比照 category 不顯示簡介段）。導覽入口沿用既有 channel badge——由現行 `/search?q=label` 文字搜尋改為深連 `/channel/{id}`（資料與行為比照 tag pill 的 id 化深連，使用者確認）。見 ADR-9。
- **alias 不是雙 URL**：每個 entity 只有一個 canonical（自己的前綴），不做「同內容掛兩個 URL」，避免 duplicate content。「alias」指的是**共用 handler/頁面邏輯**，非 URL 別名（ADR-10）。
- **不新造第三套 list 元件**：沿用既有 `ProductCard` grid 與 `ResourceList`，不平行造輪（Styling SSOT）。見 ADR-2。
- **不重新設計視覺**：沿用既有 `.product-grid`／`.resource-list`／`.catalog-pill` 樣式 token。
- **不為 category 新增 description**：`category_definition_schema`／`categories.json` 目前無 description，本 sprint 不開新欄位、不為 categories 補資料（YAGNI，避免再加一個 schema + content migration）。category 頁不顯示簡介段；tag 頁顯示既有 description。見 ADR-6。

## User Story

作為 DW嚴選的訪客，我想要點任一商品／指南的分類或標籤就進到該分類／標籤的專屬頁面，看到該主題下所有商品、指南與連結，並能把這個頁面的網址分享給別人、也能被搜尋引擎索引，以便把 DW嚴選當成可依主題瀏覽的選物站，而不只是單一商品的入口。

作為網站維運者，我想要每筆內容都有「內部 id」與「對外 slug」兩個欄位（先同值），以便未來能在不動內部識別與檔案結構的前提下，獨立調整對外網址。

### 驗收條件

#### A 區 — slug 結構鋪路（點 4）

- [ ] **AC1**：`product_schema`、`guide_schema`、`link_schema` 新增 `slug` 欄位（非空字串）。
- [x] **AC1c（2026-06-25 變更，code-review 揪出；adversarial review 確認落實）**：`product_schema`／`guide_schema`／`link_schema` 的 `id` 與 `slug` 改用 `KEBAB_CASE_ASCII_ID_PATTERN`（與 taxonomy id 同規則），禁止 CJK／非 ASCII content id。現存唯一 CJK guide（id＝slug＝`2026-06-02-日本米入門篇`）遷移為 `2026-06-02-japanese-rice-intro`：`git mv` 檔名、同步改檔內 `id`／`slug`。理由與細節見 ADR-11。單元測試斷言 CJK／非 kebab content id 被 schema 拒絕；同步更新 hardcode 該舊 id 的測試（`tests/search-index.test.ts`、`tests/public-discovery.test.ts`、`tests/build-guide-routes.test.ts`）與 `build-guide-routes.ts` 過時的「CJK route stem」註解。
- [ ] **AC2**：遷移腳本程式化把所有 product／guide／link JSON 的 `slug` 寫成 = 該檔現有 `id`，執行後所有 content JSON 同時具備 `id` 與 `slug` 且兩者相等。
- [ ] **AC3**：遷移後 `pnpm content:check` 與既有 content 測試全綠。
- [ ] **AC4**：本 sprint 不因 slug 而改變任何公開 URL、prerender 路由或 canonical（routing 仍以 id 解析）。**（2026-06-25 修訂例外，AC1c／ADR-11）**：唯一例外是 AC1c 的 CJK guide id 遷移，會使該篇公開 URL 由 `/guide/2026-06-02-日本米入門篇` 變為 `/guide/2026-06-02-japanese-rice-intro`，經使用者確認不做 redirect；除此之外不改其他 URL。

#### B 區 — payload id 化、taxonomy 資料層與路由生成（點 1、2 基礎）

- [ ] **AC5**：detail view 與 popular-tags payload 攜帶 taxonomy id（補齊現況缺口）——`ProductDetailView` 攜帶 tag id、`GuideDetailView` 攜帶 category id 與 tag id（id↔label 配對，不只 label）；`CompactTagChip` 攜帶 tag id 且 `build-navigation` 以 tag id 為計數 key。對應 mapper（`map-product-card-fields.ts`／`map-guide-detail.ts`／`build-navigation.ts`）調整，純資料映射，單元測試覆蓋 id 正確攜帶。
- [ ] **AC6**：新增 taxonomy 資料 selector——**輸入為「帶 taxonomy ids（category_id(s)／tag_ids）的 published product/guide/link 清單」**，給定 taxonomy id 與型別（category／tag）回傳該 taxonomy 下 published 的 products／guides／links（跨型別、各自 published-only），純函式可單元測試。spec 須明確此 selector 餵入的是帶 ids 的資料來源（build-time content 或已 id 化的 payload），非僅含 label 的舊 payload。
- [ ] **AC7**：`build-category-routes.ts`／`build-tag-routes.ts` 產生「至少有 1 筆 published 關聯項目」的 `/category/{id}`、`/tag/{id}`，併入 `nuxt.config` `prerender.routes`；無任何 published 關聯的 taxonomy 不進 prerender。
- [ ] **AC8**：`pnpm generate` 後所有非空 category／tag 路由皆 prerender 成功。
- [ ] **AC9**：`scripts/build-public-discovery.ts` 把非空 `/category/{id}`、`/tag/{id}`（與 route builder 同一非空判定）併入 `sitemap.xml`，使 taxonomy 頁可被搜尋引擎索引；以單元測試斷言 sitemap 含 taxonomy entries。

#### C 區 — taxonomy 瀏覽頁（點 1、2）

- [ ] **AC10**：新增 `/category/[id]` 與 `/tag/[id]` 路由。頁面顯示 taxonomy 標題（label），**tag 頁顯示既有 description、category 頁無 description 段**（見 ADR-6），並以組合式區段呈現該 taxonomy 下的商品（`ProductCard` grid）、指南（`ResourceList`）、連結（`ResourceList`）。tag 頁的 description 需為 `createTaxonomyLabelResolver` 新增 description getter 取得。
- [ ] **AC11**：只渲染「該 taxonomy 確實有 ≥1 筆 published 項目」的型別區段；空型別不顯示。三型別全空 → 該路由不 prerender，且 `category/[id].vue`／`tag/[id].vue` 於 setup `throw createError({ statusCode: 404, fatal: true })`（對齊 `products/[id].vue`、`guide/[id].vue` 的 404 機制；「不進 prerender 清單」本身不會自動 404）。
- [ ] **AC12**：頁面 SEO meta 完整——title（含 taxonomy label 與站名）、description、canonical = `/category/{id}` 或 `/tag/{id}`、OG／Twitter（沿用 `SITE_OG_IMAGE` 站台預設圖，對齊列表頁慣例）。
- [ ] **AC13**：頁面 render 測試——給定 mock taxonomy data，斷言空型別區段不渲染、SEO meta 物件值正確（自動化覆蓋 AC10–AC12）。
- [ ] **AC14**：Frontend handoff——實際開 1 個 category 頁與 1 個 tag 頁，確認標題、各型別區段、項目連結（商品／指南進站內 detail、連結外連）、head meta 正確。

#### D 區 — taxonomy 導向消歧（點 3）

- [ ] **AC15**：**product detail 與 guide detail 兩頁**的 category pill 由 label 文字搜尋／`/?category=<id>` 改為 `/category/{id}`；tag pill 由 `/search?q=<label>` 改為 `/tag/{id}`（帶 id，非 label 文字）。依賴 AC5 的 id 化 payload。
- [ ] **AC16**：search idle 面板的熱門標籤 chip 點擊由「文字搜尋」改為深連 `/tag/{id}`（依賴 AC5 的 `CompactTagChip` 帶 id）。
- [ ] **AC17**：上述導向以測試覆蓋（product／guide detail 的 pill 與熱門 chip 產生的 `to` 指向正確的 taxonomy 路由與 id）。

#### F 區 — brand／channel alias 頁（修訂 2026-06-24）

- [ ] **AC20**：selector（`select-taxonomy-items.ts`）`kind` 由 `'category' | 'tag'` 擴為含 `'brand' | 'channel'`：brand 沿用 tag 的 `tag_ids` predicate；channel 對 products 以 `offers[].channel_id` 過濾、guides／links 恆空（products-only，ADR-9）。`TaxonomyProductItem` 擴充攜帶 `channel_ids`（自 offers 抽取），純函式單元測試覆蓋 brand／channel membership。
- [ ] **AC21**：非空判定與路由生成——`collectNonEmptyTaxonomyIds`（或對應 helper）把非空 `tag_ids` 依 `brands.json` 成員切分為 brand ids 與 tag ids，並蒐集非空 channel ids；`build-brand-routes.ts`／`build-channel-routes.ts`（或擴充既有 builder）產生 `/brand/{id}`、`/channel/{id}`，併入 `nuxt.config` prerender；`/tag/{id}` 不再含 brand id。單元測試斷言切分正確、brand id 不出現在 `/tag` 清單。
- [ ] **AC22**：新增 `/brand/[id].vue`、`/channel/[id].vue` thin route 檔，呼叫 `useTaxonomyPageData('brand'|'channel', id)`、canonical = `/brand/{id}`／`/channel/{id}`，沿用 `TaxonomyPage` 與 SEO 慣例（ADR-10）；空 taxonomy 比照 tag 頁 `throw createError(404)`。`build-taxonomy-page-data`／`taxonomy-page-seo`／`use-taxonomy-page-data` 接受新 kind 並正確映射 canonical 前綴與 label/description 來源（brand→brands.json，channel→channels.json 無 description）。
- [ ] **AC23**：`scripts/build-public-discovery.ts` 把非空 `/brand/{id}`、`/channel/{id}`（與 route builder 同一非空判定）併入 `sitemap.xml`；單元測試斷言含 brand／channel entries。
- [ ] **AC24**：D 區導向消歧對齊新前綴，channel badge 比照 tag pill 做 id 化深連——①熱門標籤 chip／detail pill 若指向 brand id，`to` 改為 `/brand/{id}`（非 `/tag/{brand}`）；②channel badge（`product-card.vue`、`product-detail.vue`）由現行 `/search?q=channel_label` 文字搜尋改為深連 `/channel/{channel_id}`，payload 補齊 detail view 的 `channel_id`（card view 已有；`getChannelLabel`／`channel_id` 抽取沿用）。測試覆蓋 brand chip／pill 指向 `/brand/{id}`、channel badge 指向 `/channel/{channel_id}`。
- [x] **AC24b（handoff 揪出，2026-06-24）**：**detail 頁的 tag pills 含 brand id 必須路由到 `/brand/{id}`**。`product-detail.vue`／`guide-detail.vue` 現把全部 `tag_ids` 渲染成 `/tag/{id}`，但 `tag_ids` 本就混 brand id（如 `panasonic`），brand 搬到 `/brand/` 後這些 pill 指向死路由 `/tag/{brand}`，被 NuxtLink prefetch 即觸發 setup 404 錯誤。修法比照 search-idle 既有 `{tags, brands}` 切分（`CompactSearchTagGroups`）：detail 的 mapper（`map-product-detail.ts`／guide 對應）依 `brands.json` 把 `tag_ids` 切成 tags 與 brands，detail 元件 brand pill → `/brand/{id}`、tag pill → `/tag/{id}`。測試斷言 brand id 不再出現於 `/tag/` pill、且 detail 頁無死路由連結。
- [ ] **AC25**：Frontend handoff——實際開 1 個 `/brand/{id}` 與 1 個 `/channel/{id}` 頁，確認 brand 顯示 label＋description、channel 顯示 label＋products-only grid（無簡介、無 guide/link 區段）、項目連結正確、head meta／canonical 正確；並從商品卡／detail 點 channel badge 確認導到對應 `/channel/{id}`。
- [x] **AC26（handoff 揪出）**：taxonomy 頁標題改用 layout breadcrumb，對齊 detail 頁。移除 `taxonomy-page.vue` 的 kicker（`taxonomy_kind === 'tag' ? '標籤' : '分類'`，brand/channel 會錯誤 fallback「分類」）與頁內 H1；改在 `app/layouts/default.vue` 的 `current_breadcrumb_items` 為 `/category|tag|brand|channel/{id}` 推導 `[{ label }]`，呈現「DW嚴選 > {label}」。頁內保留 description 段（tag/brand 有簡介時）。label 解析需於 layout 取得（與既有 detail breadcrumb 由 `catalog_shell_data` 解析同源語義）。測試斷言四種 taxonomy kind 的 breadcrumb label 正確、頁內不再有重複 H1／錯誤 kicker。
- [x] **AC27（handoff 揪出）**：product card hover 視覺一致——`.product-card-meta`（價格＋badge 區）為 `.product-card-link` 的兄弟節點，現 hover 底色只套 `.product-card-link:hover`，dark theme 下 meta 區底色不跟著變。修法讓 hover 底色涵蓋整張卡（含 meta），一律走 `--dw-*` token；並一併掃同類 `.related-product-card`（CLAUDE.md：改視覺缺陷掃同類）。

#### E 區 — 品質 gate

- [ ] **AC18**：`pnpm test`（含新 unit test，涵蓋 F 區）、`pnpm lint` 本機全綠。
- [ ] **AC19**：`pnpm typecheck`、`pnpm content:check`、`pnpm generate`（含 brand／channel 路由 prerender）通過（Docker／使用者環境）。

## 相關檔案

- `app/utils/product-schema.ts` — 三個 content schema 加 `slug`（A 區）。
- `content/products/*.json`、`content/guides/*.json`、`content/links/*.json` — 遷移腳本種 `slug`（A 區）。
- `scripts/`（新增遷移腳本）、`scripts/build-category-routes.ts`、`scripts/build-tag-routes.ts`（新增，B 區）。
- `nuxt.config.ts` — prerender.routes 併入 taxonomy 路由（B 區）。
- `app/pages/category/[id].vue`、`app/pages/tag/[id].vue` — 新頁面（C 區）。
- `app/utils/published-products/`（新增 taxonomy selector）、`app/components/product-detail.vue`、**`app/components/guide-detail.vue`**、`app/components/catalog-pill.vue` 使用處、search idle 面板（C／D 區）。
- **payload id 化（B 區 AC5）**：`app/utils/public-content-view-types.ts`（detail view 加 tag/category id）、`scripts/public-payload/map-product-card-fields.ts`、`scripts/public-payload/map-guide-detail.ts`、`scripts/public-payload/build-navigation.ts`、`app/utils/published-products/types.ts`（`CompactTagChip` 加 id）。
- `app/utils/content/taxonomy-labels.ts` — `createTaxonomyLabelResolver` 新增 tag description getter（C 區 AC10）。
- `scripts/build-public-discovery.ts` — sitemap 併入 taxonomy 路由（B 區 AC9、F 區 AC23）。
- **brand／channel alias（F 區）**：`scripts/build-brand-routes.ts`／`scripts/build-channel-routes.ts`（新增）、`app/pages/brand/[id].vue`／`app/pages/channel/[id].vue`（新增 thin route）、`select-taxonomy-items.ts`（擴 kind＋channel predicate＋`channel_ids`）、`non-empty-taxonomy-ids.ts`（brand/tag 切分＋channel 蒐集）、`read-published-taxonomy-items.ts`（products 帶 channel_ids）、`build-taxonomy-page-data.ts`／`taxonomy-page-seo.ts`／`use-taxonomy-page-data.ts`（接受新 kind、映射 canonical 前綴與 label 來源）、`nuxt.config.ts`（prerender 併入 brand/channel）。
- **channel badge 導向（F 區 AC24）**：`app/components/product-card.vue`、`app/components/product-detail.vue`（badge `to` 由 `/search?q=channel_label` 改 `/channel/{channel_id}`）、`app/utils/public-content-view-types.ts`（detail view 補 `channel_id`，card view 已有）。

## 既有資產盤點 / Reuse Map

| 既有資產 | 位置 | 本次如何沿用 |
|---|---|---|
| `ProductCard` + `.product-grid` | `app/components/`、首頁 | taxonomy 頁的「商品」區段直接複用，不新造商品卡。 |
| `ResourceList` | `app/components/resource-list.vue` | taxonomy 頁的「指南」「連結」區段複用（已支援 rows + 站內／外連屬性）。 |
| `getSearchResultSections` / `map-resource-rows` pattern | `app/utils/published-products/resource-rows.ts`、`scripts/public-payload/map-resource-rows.ts` | 仿其「依型別分區 + 映射 row」邏輯建 taxonomy 頁的型別區段。 |
| `build-product-routes.ts` / `build-guide-routes.ts` | `scripts/` | 仿其「掃資料夾 → 過濾 published → 產 route stem」pattern 寫 build-category/tag-routes。 |
| `buildNavigation` category-count 邏輯 | `scripts/public-payload/build-navigation.ts` | 仿其「count > 0 才納入」判斷哪些 taxonomy 非空、該進 prerender。 |
| `createTaxonomyLabelResolver` | `app/utils/content/taxonomy-labels.ts` | 取 category／tag 的 label 供頁面標題與 SEO。**注意：現況只有 label getter、無 description getter**；tag description 需新增 getter（C 區 AC10），category 無 description（ADR-6）。 |
| `getCanonicalUrl`、`SITE_OG_IMAGE`、`SITE_NAME`、`useSeoMeta` 慣例 | `app/utils/seo-metadata.ts`、各頁 | taxonomy 頁 SEO meta 沿用同一套 helper 與慣例。 |
| `catalog-pill.vue` | `app/components/catalog-pill.vue` | `to` prop 元件本身不動；但**餵給它的資料需先 id 化**——detail view／chip 目前只有 label，D 區導向消歧依賴 B 區 AC5 先讓 payload 攜帶 tag/category id。 |
| `extract-content-id.ts` | `app/utils/content/` | id 抽取沿用。 |

**需修改的既有檔案（review 揪出，非純複用）**：① `public-content-view-types.ts`＋`map-product-card-fields.ts`／`map-guide-detail.ts`（detail view 攜帶 tag/category id）；② `build-navigation.ts`＋`published-products/types.ts`（`CompactTagChip` 帶 id、以 id 計數）；③ `taxonomy-labels.ts`（tag description getter）；④ `guide-detail.vue`（兩個 label-search pill 改 id 導向）；⑤ `build-public-discovery.ts`（sitemap 加 taxonomy entries）。這些原 Reuse Map 誤列為零成本複用，實為 B／C／D 區的資料層工作。

新建項目：① 三個 content schema 的 `slug` 欄位 + 一次性遷移腳本（種值 = id）；② `build-category-routes.ts`／`build-tag-routes.ts`；③ taxonomy 資料 selector（id → published products/guides/links）；④ `category/[id].vue`、`tag/[id].vue` 頁面（compose 既有 list 元件）。皆為現況不存在、且無法由既有資產直接覆蓋者。

## 介面/資料結構

本站為 Nuxt SSG，無 runtime API；介面即「content JSON schema」與「prerender 路由」。

### slug 欄位（A 區）

```jsonc
// content/products/2026-06-02-adata-power-bank.json（遷移後）
{
  "id": "2026-06-02-adata-power-bank",
  "slug": "2026-06-02-adata-power-bank",  // 新增，本 sprint = id
  "status": "published",
  "name": "...",
  // ...其餘不變
}
```

### taxonomy 頁資料 selector 輸出（B／C 區）

```ts
type TaxonomyPageData = {
  taxonomy_kind: 'category' | 'tag' | 'brand' | 'channel'  // brand/channel 為 alias mode（ADR-9/10）
  id: string
  label: string
  description: string | null
  products: ProductCardView[]   // published-only，空陣列代表不顯示該區段
  guides: ResourceRow[]
  links: ResourceRow[]
}
```

### 新增 prerender 路由

```
/category/{category_id}   // 對每個有 ≥1 published 關聯項目的 category
/tag/{tag_id}             // 對每個有 ≥1 published 關聯項目的 tag（不含 brand id）
/brand/{brand_id}         // 對每個有 ≥1 published 關聯項目的 brand（tag_ids ∩ brands.json）
/channel/{channel_id}     // 對每個被 ≥1 published product 的 offers 引用的 channel
```

## 邊界案例

- **某 taxonomy 只有商品、沒有指南／連結**：只渲染商品區段，其餘不顯示。
- **某 taxonomy 三型別全空（或關聯項目皆非 published）**：route builder 不收錄該 id（不 prerender）；同時頁面 setup `throw createError({ statusCode: 404, fatal: true })`，使直接訪問空 taxonomy 回 404 而非空白頁（SSG 下「不進 prerender」不會自動 404，需頁面主動丟，對齊 `products/[id].vue`、`guide/[id].vue`）。
- **同一 id 同時是某 category 與某 tag**：路由前綴 `/category/` vs `/tag/` 即消歧，互不干擾（不需全站唯一 id）。
- **brand id 必須只出現在 `/brand/`、不出現在 `/tag/`**：route builder 依 `brands.json` 成員切分 `tag_ids`，brand id 從 `/tag` 清單剔除，確保單一 canonical（ADR-8/10）。
- **channel 頁只有 products**：guide／link 無 `offers`，channel 頁恆無 guide／link 區段；若某 channel 無任何 published product 引用 → 不生路由、不進 sitemap，直接訪問 `throw 404`。
- **channel 無 description**：`channels.json` 無 description 欄位，channel 頁不顯示簡介段（比照 category，resolver `getChannelLabel` 只回 label）。
- **id 一律 ASCII kebab-case**：`taxonomy_id_schema` 強制 category／tag／channel id 為 ASCII；**content id（product／guide／link 檔名）亦於 2026-06-25 改為強制 ASCII kebab（AC1c／ADR-11，取代原「guide content 檔名可含 CJK」）**。故所有 route stem 安全、無需 `encodeURIComponent`，breadcrumb 取 `route.path` 末段查表也無 percent-encode 錯位；全站無 CJK id。
- **遷移腳本重跑**：以 id 覆寫 slug 為冪等操作，重跑結果一致。
- **本機 runtime 限制**：本機只能跑 vitest／eslint；typecheck／content:check／generate／開頁面需 Docker 或使用者。

## ADR

### ADR-1：新增 dedicated taxonomy 路由，而非繼續用首頁 query
獨立 `/category/{id}`、`/tag/{id}` 才能被 prerender、被搜尋引擎索引、被單獨分享；首頁 `?category=` query 不是獨立文件、不可索引。標籤更是完全沒有對應頁。替代方案（維持 query-only）無法滿足「可索引、可分享」目標，排除。

### ADR-2：複用既有 list 元件組合，不另造三個新元件
使用者的「三種 list 各組一個元件、頁面決定 include 哪些」由既有資產即可滿足：商品用 `ProductCard` grid、指南／連結用 `ResourceList`（本就跨型別 row 渲染）。taxonomy 頁的工作是「依型別組合區段」，不是造新元件。再開三個新 list 元件會與既有 `ResourceList`／`ProductCard` 重複，違反 Styling SSOT 與「第三次才抽象」。替代方案（造 generic 新 list）排除。

### ADR-3：保留首頁 `?category=` 快速篩選，與 dedicated 頁並存
首頁分類 chip 是「原地過濾、不離開首頁」的快速 UX；dedicated `/category/{id}` 是「可分享、可索引」的正規入口。兩者用途不同。`?category=X` 並非獨立 prerender 文件（首頁只 prerender `/`），故無 duplicate-content 問題：`/category/{id}` 為該分類的 canonical。替代方案（把首頁 chip 全導去 dedicated 頁）會退化原地過濾 UX，排除。

### ADR-4：slug 本 sprint 只結構鋪路、不改 URL
使用者明確選擇「先把 id 當 slug、程式化更新資料，URL 用哪個再討論」。故本 sprint 只新增 `slug` 欄位並種值 = id，routing 仍以 id 解析、不動 canonical、不導轉。理由：避免在 URL 最終決策前就承擔 SEO 遷移與 redirect 包袱；slug=id 時改 routing 為純結構性、零風險、完全可逆。未來真要切換 URL 時，只需改 slug 值 + 加 `_redirects`，schema 與資料結構已就緒。替代方案（這個 sprint 就把 product URL 改乾淨 slug + 導轉）被使用者否決。
**2026-06-25 部分推翻（code-review 揪出，見 ADR-11）**：ADR-4「不改 URL」的前提是「id 本身無問題、slug=id 僅結構鋪路」，但唯一 CJK guide id 會讓 CJK 進 route stem、引發 breadcrumb 編碼錯位與分享／SEO 脆弱——那正是「id 本身有問題」的反例。經使用者確認，改 content id 強制 ASCII 並遷移該篇（URL 隨之變更、不做 redirect）；其餘檔案 slug=id 結構鋪路的「不改 URL」仍成立。

### ADR-5：`slug` 設為必填、由遷移腳本一次種滿
schema `.strict()` 下，新增欄位需所有檔案同步具備才能通過 `content:check`。本 sprint 以遷移腳本原子式種滿全部檔案，故 `slug` 設必填（非空字串），語義明確。替代方案（選填 + 讀取時 fallback id）較鬆散、且本 sprint 本就要種滿全部，必填更直接。若日後出現需漸進遷移的型別，再議。

### ADR-6：category 本 sprint 不做 description，只 tag 頁顯示簡介
review 揪出 `category_definition_schema`／`categories.json` 無 description 欄位與資料，`createTaxonomyLabelResolver` 也無 description getter；只有 tag 有 description。原 spec「（若有）description」對 category 是恆假死碼。為 category 補 description 需再開一個 schema 欄位 + 一次性 content migration（為每個 category 寫簡介），屬本 sprint 目標外的內容工作。決策：category 頁不顯示 description 段；tag 頁顯示既有 description（只需為 resolver 加 getter）。理由：YAGNI——taxonomy 頁的核心價值是「列出該主題的項目」，category 簡介非必要；真要做留待後續內容 sprint。替代方案（本 sprint 補齊 category description）被排除以免擴張 scope。

### ADR-8：brand 走專屬 `/brand/{id}` 前綴，label/description fallback 到 brands.json（2026-06-24 改寫）
**原決策**（已被取代）：brand 與 tag 共用 `tag_ids` namespace，故讓 brand 直接走 `/tag/{brand}`，label/description fallback 到 `brands.json`。
**改寫決策**（使用者確認 2026-06-24）：brand 改走**專屬 `/brand/{id}`** 前綴，不再用 `/tag/{brand}`。理由：brand 雖與 tag 共用 `tag_ids` 與 membership predicate（`tag_ids.includes(id)`），但對外是獨立的瀏覽維度，獨立前綴讓網址語義清楚、canonical 單一（`/brand/{id}`），且與「channel 也獨立前綴」對稱。實作上 route builder 把非空 `tag_ids` 依 `brands.json` 切分：屬 brand 的 id 收進 `/brand/`、其餘收進 `/tag/`，兩 namespace 互斥（`brands.json`／`tags.json` id 不重疊）。label/description 沿用既有 `getTaxonomyTagLabel`／`getTaxonomyTagDescription` 的 tags→brands fallback（`taxonomy-labels.ts` 已實作）。替代方案（維持 `/tag/{brand}`，或 `/tag` 與 `/brand` 雙 URL）被排除：前者前綴語義混雜，後者造成 duplicate content（見 ADR-10）。

### ADR-9：channel 以自有 predicate 接入 taxonomy 頁（alias mode），products-only、無 description
channel 與 tag/brand 不同——成員資格不在 `tag_ids`，而來自 `offers[].channel_id`（產品的購買通路）。決策（使用者確認）：channel 複用同一套 taxonomy 頁 handler（ADR-10 alias mode），但 selector 新增一條 channel 解析路徑：對 published products 以 `offers[].channel_id.includes(selector.id)` 過濾；guides／links 無購買連結，channel 頁恆為 **products-only**（無 guide／link 區段）。label 取自 `channels.json`（`getChannelLabel` 已實作）；`channels.json` 無 description 欄位，故 channel 頁**不顯示簡介段**（比照 category，ADR-6 同理）。非空判定：只有被 ≥1 published product 的 offers 引用的 channel 才生 `/channel/{id}` 路由與 sitemap entry。**導覽入口**：既有 channel badge（`product-card.vue`／`product-detail.vue`）現行導去 `/search?q=channel_label`（與 tag/category pill 同屬 D 區要消歧的 label 文字搜尋反模式），改為深連 `/channel/{channel_id}`，行為與 tag pill 一致；payload 大多已帶 `channel_id`（card view 已有，detail view 補齊）。理由：channel 是實用的「依通路瀏覽」維度、資料已存在於 offers，接入成本低且與 tag/brand 頁對稱；badge 既已存在，改 `to` 即得導覽入口，無需新造 UI。替代方案（用 channels.json 的 `host_patterns` 比對連結 host）被排除——`channel_id` 已是 content 上的精準關聯，host 比對是多餘且脆弱的反查。

### ADR-10：「alias mode」= 共用頁面 handler、各自單一 canonical，非雙 URL
brand／channel 與 tag 共用同一個 taxonomy 頁 handler（`useTaxonomyPageData(kind, id)` + `TaxonomyPage` 元件 + `build-taxonomy-page-data` + `taxonomy-page-seo`），由 `kind` 參數化驅動 label/description 來源、membership predicate、canonical 前綴。「alias」指的是**程式層共用同一套渲染與組段邏輯**，不是 URL 別名：每個 entity 只有一個對外 canonical（`/tag/{id}`、`/brand/{id}`、`/channel/{id}` 各一），不存在「同內容掛兩個 URL」。理由：基礎設施已高度參數化（page、composable、seo、label resolver 皆吃 kind），新增 brand/channel 只需擴 `kind` 列舉、加 membership 分支、加 thin route 檔與 route builder，重用度最高；單一 canonical 避免 duplicate-content SEO 問題。替代方案（為 brand/channel 各造獨立頁元件、或讓 `/tag/{brand}` 與 `/brand/{brand}` 並存）被排除——前者違反 Styling SSOT 與「第三次才抽象」，後者製造重複內容。
**2026-06-25 補強（adversarial review 揪出）**：route builder 的 brand/tag 切分只擋住 prerender 清單，擋不住對非 prerender 路由的直接／client-side 訪問——`/tag/{brand}` 在 runtime 仍會因 brand 與 tag 共用 `tag_ids` predicate 而選到項目、渲染出 brand 內容，違反單一 canonical。修法：`build-taxonomy-page-data.ts` 在選取項目前先驗證 `selector.id` 屬於 `selector.kind` 的 namespace（category∈categories、tag∈tags 且 ∉brands、brand∈brands、channel∈channels），不符回 `null`→404。測試覆蓋 `/tag/{brand}`、`/brand/{tag}`、未知 channel/category id。

### ADR-7：先 id 化 payload，再做導向消歧（H1 前置）
review 揪出 detail view／popular-tags payload 只攜帶 label、不帶 id（mapper 把 `tag_ids.map(getTagLabel)` 轉 label 後丟棄 id；`build-navigation` 以 label 計數）。故「tag pill／熱門 chip 帶 id 深連 `/tag/{id}`」並非「只改 `to` 目標」的零成本改動，而需先擴充 view type、mapper、navigation builder 攜帶 taxonomy id。決策：把「payload id 化」獨立為 B 區 AC5，作為 selector（AC6）、頁面（C 區）、導向消歧（D 區）共同的資料地基，先於頁面與導向完成。理由：id 是後續所有工作的最小共同前提，補在資料層一次到位最省重工。替代方案（在 view 層用 label 反查 id）排除——label 非唯一鍵、反查脆弱，違反「精準帶 id」目標。

### ADR-11：content id 強制 ASCII kebab、唯一 CJK guide 遷移、不做 redirect（2026-06-25，code-review 揪出）
M5 cross-review 揪出：`resolve-breadcrumb-items.ts` 的 `getRouteId` 從 percent-encoded 的 `route.path` 取末段當查表 key，而 `*_details_by_id` 以 decode 後的 id 為鍵；唯一的 CJK content id（guide `2026-06-02-日本米入門篇`）因此在 detail 頁麵包屑查表錯位，退回泛用 fallback「指南詳情」（舊 layout 用 decode 後的 `route.params.id`，故無此問題，屬本次重構引入的 regression）。根因不在 breadcrumb，而在「允許 CJK content id ＝ CJK 進 route stem」。
**決策（使用者確認 2026-06-25）**：從源頭治本——`product_schema`／`guide_schema`／`link_schema` 的 `id` 與 `slug` 改用 `KEBAB_CASE_ASCII_ID_PATTERN`（與 taxonomy id 同規則），禁未來 CJK content id；現存該篇 guide 遷移為 `2026-06-02-japanese-rice-intro`（`git mv` 檔名＋同步改 `id`／`slug`）。公開 URL 隨之由 `/guide/2026-06-02-日本米入門篇` 變為 `/guide/2026-06-02-japanese-rice-intro`，**經使用者確認不做 redirect**（站無 redirect 機制、該篇為三週草稿、SEO／外部連結價值近零）。
理由：content id ＝ 檔名 ＝ 公開 route stem，CJK 進 URL 是 breadcrumb 編碼錯位、URL 不可讀／難分享、未來任何「拿 path 當 key」皆脆弱的共同根源；全站強制 ASCII 後 breadcrumb 不需 `decodeURIComponent`、route stem 不需 `encodeURIComponent`，治標的一行 decode 反而留下隱性陷阱。此舉部分推翻 ADR-4（見該條 2026-06-25 註記）。替代方案（① breadcrumb 加 decode 治標、② 只鎖 slug 待未來 URL 切 slug）被排除：①留 CJK 在系統、未根治；②現在 URL 仍解析 id，breadcrumb 照壞，治本得等大改 routing。
**2026-06-25 後續（adversarial review 連帶）**：ASCII gate 使 deprecated Google Sheet importer（`scripts/legacy/migrate-google-sheet-products.ts`，`getReadableSlug` 刻意保留 Unicode、產 CJK slug 並以 `product_schema.parse()` 驗證）測試失敗。經使用者裁決，移除該 importer 與其測試——cutover 早完成、`content/` 為 SSOT、CLAUDE.md 明言公開 runtime 不依賴 Google Sheets；`README.md`／`AGENTS.md` 同步。其呼叫的 `migrate-product-compact-schema.ts` 獨立且測試綠，保留（移除後僅自身測試引用）。

## Milestones

> M1（slug）獨立可交付、與路由工作無相依；M2–M4 為 taxonomy 路由主體。M2 的 payload id 化是 M3 頁面與 M4 導向消歧的共同地基（ADR-7），故 M2 先行；M3、M4 皆依賴 M2，M4 另依賴 `/category`、`/tag` 路由存在（M3）。**M4.5（brand／channel alias，2026-06-24 新增）依賴 M2/M3 的 selector 與頁面 handler，接在其後。**

### M1：slug 結構鋪路
> 範圍：`product-schema.ts` 三個 schema、遷移腳本、`content/**/*.json`。
> 驗證：schema 單元測試 + 腳本冪等性測試；`pnpm content:check`（Docker）。
> 預期結果：所有 content JSON 同時有 `id` 與 `slug` 且相等；無任何 URL／路由變更。

- [ ] Red → Green → Refactor（AC1–AC4）

### M2：payload id 化 + taxonomy 資料 selector + 路由／sitemap 生成
> 範圍：先 id 化 payload（`public-content-view-types.ts`、`map-product-card-fields.ts`、`map-guide-detail.ts`、`build-navigation.ts`、`CompactTagChip`）作為地基（ADR-7）；新增 taxonomy selector（`app/utils/published-products/`）、`build-category-routes.ts`／`build-tag-routes.ts`、`nuxt.config` prerender 併入；`build-public-discovery.ts` sitemap 併入 taxonomy 路由。
> 驗證：payload id 攜帶、selector、route-builder、sitemap 純函式單元測試；`pnpm generate`（Docker）確認路由 prerender 與 sitemap。
> 預期結果：payload 攜帶 taxonomy id；非空 category／tag 皆有對應 prerender 路由與 sitemap entry，空 taxonomy 不進清單。

- [ ] Red → Green → Refactor（AC5–AC9）

### M3：taxonomy 瀏覽頁 + 可組合 list
> 範圍：`category/[id].vue`、`tag/[id].vue`，compose `ProductCard` grid + `ResourceList`，SEO meta、tag description getter、空 taxonomy 404 guard。
> 驗證：頁面 render 測試（區段條件顯示、SEO meta 值、404）；`pnpm typecheck`／`generate`（Docker）；實際開 category／tag 頁（Frontend handoff）。
> 預期結果：分類／標籤頁正確顯示各型別區段、空型別不顯示、tag 頁顯示 description、SEO meta 完整、空 taxonomy 回 404。

- [ ] Red → Green → Refactor（AC10–AC14）

### M4：taxonomy 導向消歧
> 範圍：`product-detail.vue` 與 `guide-detail.vue` 的 pill 導向、search idle 熱門標籤 chip 導向（皆依賴 M2 的 id 化 payload）。
> 驗證：pill／chip 導向測試（product／guide 的 `to` 指向正確路由與 id）；實際點擊驗證（Frontend handoff）。
> 預期結果：product／guide detail 的 category／tag pill 與熱門標籤精準導到對應 taxonomy 頁，不再走 label 文字搜尋。

- [ ] Red → Green → Refactor（AC15–AC17）

### M4.5：brand／channel alias 頁（修訂 2026-06-24）
> 範圍：擴 selector kind（brand 沿用 tag predicate、channel 用 offers predicate、products-only）、`channel_ids` 抽取、brand/tag namespace 切分、`build-brand-routes.ts`／`build-channel-routes.ts`、`brand/[id].vue`／`channel/[id].vue` thin route、`build-taxonomy-page-data`／seo／composable 接受新 kind、sitemap 併入、brand chip/pill 改指 `/brand/{id}`、channel badge（`product-card.vue`／`product-detail.vue`）改指 `/channel/{channel_id}`＋detail view 補 `channel_id`（ADR-8/9/10）。
> 依賴：M2（payload id 化、selector、route-builder 框架）、M3（taxonomy 頁 handler、`TaxonomyPage`、composable）皆為其地基；故 M4.5 接在 M3/M4 之後。
> 驗證：selector／route-builder／sitemap 純函式單元測試（brand/channel membership、namespace 切分、brand 不入 /tag）；頁面 render 測試（channel products-only、無 description 段）；`pnpm generate`（Docker）確認 brand/channel 路由 prerender；實際開 1 brand＋1 channel 頁（Frontend handoff，AC25）。
> 預期結果：`/brand/{id}`、`/channel/{id}` 可索引可分享、由共用 handler 驅動、單一 canonical；brand 不再出現於 `/tag/`。

- [x] Red → Green → Refactor（AC20–AC25）— 本機 `pnpm test`（496 passed）／`pnpm lint` 全綠；AC25 Frontend handoff 與 Docker gate 待驗。

### M5：cross review + 收尾
> 範圍：`/ddd.xreview`、`works.md`、commit 準備；**code-review 揪出的 content id ASCII gate + CJK guide 遷移（AC1c／ADR-11）**。
> 驗證：review findings 處理完畢；品質 gate 全綠（AC18–AC19）。
> 預期結果：使用者授權後 commit（只 add 本 sprint 相關檔案）。

- [x] content id 強制 ASCII kebab + 遷移 `2026-06-02-日本米入門篇` → `2026-06-02-japanese-rice-intro`（schema gate + 測試、更新 hardcode 測試與 `build-guide-routes.ts` 註解；`pnpm test` 全綠）
- [x] Codex adversarial review（2026-06-25）：兩個 finding 修復——① runtime taxonomy namespace guard（ADR-10 強化，見該條 2026-06-25 補強）；② AC1c id/slug ASCII gate（同上）
- [x] 移除 deprecated Google Sheet importer（`scripts/legacy/migrate-google-sheet-products.ts` + 測試；與 AC1c ASCII gate 不相容，使用者裁決移除）；`vitest.config.ts` exclude `.worktree/**`；README／AGENTS 同步（見 ADR-11 後續）
- [x] 更新 `works.md`；使用者授權後 commit（本機 `pnpm test` 512 passed／`lint` clean；Docker gate AC19 待驗）
