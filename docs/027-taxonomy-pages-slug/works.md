# 027 works

## 2026-06-24 — M4.5：brand／channel alias 頁（spec 變更後新增）

### 緣由
使用者提出把 `/brand/*` 與 `/channel/*` 當成 tag 的 alias mode。經釐清資料模型後確認：
- brand 與 tag 共用 `tag_ids` namespace、membership predicate 相同 → 純前綴搬移（`/tag/{brand}` → `/brand/{id}`）。
- channel 成員來自 `offers[].channel_id`（products-only），與 tag 不同 → selector 新增 channel predicate。
- 「alias」= 共用同一套頁面 handler、各自單一 canonical，非雙 URL（ADR-10）。
- channel badge 既已存在（原導 `/search?q=label` 文字搜尋），改為 id 化深連 `/channel/{id}`，行為比照 tag pill。

spec 同步：ADR-8 改寫、新增 ADR-9/10、非目標／目標／邊界案例／相關檔案更新、F 區 AC20–AC25、M4.5 milestone。

### 實作（ddd-developer，TDD）
- **AC20 selector**：`select-taxonomy-items.ts` 擴 `TaxonomyKind = 'category'|'tag'|'brand'|'channel'`；brand 沿用 `tag_ids` predicate、channel 用 `channel_ids`（products-only）；`TaxonomyProductItem.channel_ids`，由 `read-published-taxonomy-items.ts` 自 `offers[].channel_id` 抽取。
- **AC21 非空切分／route builder**：`non-empty-taxonomy-ids.ts` 回 `{category_ids, tag_ids, brand_ids, channel_ids}`，依傳入 brand id 集合切分（未傳則向後相容）；新增 `build-brand-routes.ts`／`build-channel-routes.ts`，`build-tag-routes.ts` 剔除 brand id，`nuxt.config.ts` prerender 併入。
- **AC22 頁面**：`pages/brand/[id].vue`、`pages/channel/[id].vue`（thin route，空 taxonomy throw 404）；`build-taxonomy-page-data.ts`／`taxonomy-page-seo.ts`／`use-taxonomy-page-data.ts`／`types.ts` 接受新 kind，brand→brands label/desc、channel→channels label（無 description）。
- **AC23 sitemap**：`build-public-discovery.ts` 併入非空 `/brand/`、`/channel/`。
- **AC24 導向**：brand chip → `/brand/{id}`（`search-idle-panel.vue` 以 `to_prefix` 分流）；channel badge → `/channel/{channel_id}`（`product-card.vue`、`product-detail.vue`）；card view payload 補 `channel_ids`（全 offer 去重）＋保留 `channel_id`（primary，badge 目標）。

### 驗證
- 本機：`pnpm test` 496 passed（69 files）、`pnpm lint` clean。Coordinator 獨立複跑確認。
- 抽查：route builder 切分正確（brand 不入 `/tag`）、Why 註解到位。
- 待驗：`pnpm typecheck`／`content:check`／`generate`（Docker）、`pnpm test:e2e`、AC25 Frontend handoff（開 1 brand＋1 channel 頁、點 channel badge）。

### 修正紀錄
- spec 原誤植 channel 成員欄位為 `purchase_links[].channel_id`，實際 schema 為 `offers[].channel_id`；已全文更正，實作依正確欄位。

## 2026-06-24 — Frontend handoff 修正（AC24b / AC26 / AC27）

使用者開頁驗收揪出三點，派 ddd-developer 以 TDD 修復：

- **AC24b（真 bug）**：detail 頁把全部 `tag_ids` 渲染成 `/tag/{id}` pill，但 `tag_ids` 混 brand id（adata、panasonic…），brand 搬到 `/brand/` 後這些 pill 指向死路由 `/tag/{brand}`，被 NuxtLink prefetch 觸發 setup 404（agent-browser console 確認）。修法比照 search-idle 的 `{tags, brands}` 切分：新增純函式 `app/utils/content/split-detail-taxonomy-tags.ts`＋`isBrandId`（`taxonomy-labels.ts`），`map-product-detail.ts`／`map-guide-detail.ts` 切分，`ProductDetailView`／`GuideDetailView` 加 `brand_ids`／`brand_labels`，detail 元件 brand pill→`/brand/{id}`、tag pill→`/tag/{id}`。
- **AC26**：taxonomy 頁標題改用 layout breadcrumb，對齊 detail 頁。移除 `taxonomy-page.vue` kicker＋H1（brand/channel 原會誤 fallback「分類」），抽純函式 `app/utils/breadcrumb/resolve-breadcrumb-items.ts`，layout 為四種 taxonomy kind 推導「DW嚴選 > {label}」；label 解析方案＝擴 `catalog_shell_data.taxonomies`＋既有 `createTaxonomyLabelResolver`（SSR 安全、純函式可測、零新解析邏輯）。
- **AC27**：product card hover 底色由 `.product-card-link:hover` 改 `.product-card:hover`，涵蓋兄弟節點 `.product-card-meta`（價格＋badge 區），dark theme 不再只變上半；走 `--dw-accent` token。

### 驗證
- 本機：`pnpm test` 518 passed（71 files）、`pnpm lint` clean（coordinator 複跑）。
- **實機 agent-browser（coordinator 親驗）**：
  - detail 頁（adata 行動電源）pill：category→`/category/computer-3c`、channel→`/channel/pchome`、**brand→`/brand/adata`**（原死路由已修）、tag→`/tag/power-charging`；console 無 `/tag/{brand}` 錯誤。
  - 四種 taxonomy 頁 breadcrumb 皆「DW嚴選 > {label}」、無頁內 H1／kicker、channel products-only 無簡介、brand/tag 顯示簡介、category 無簡介；channel 不再顯示「分類」。
  - channel badge 點擊導到 `/channel/{id}`（先前「沒反應」實為 HMR reconnect 瞬間＋舊「分類」標題不易辨識；breadcrumb 修正後導向結果明確）。
  - dark theme 卡片 hover：整卡（含 meta）套 accent 5% 底色，computed style 確認。

### 待辦
- Docker gate（typecheck/content:check/generate）+ 正式 AC25 handoff 簽核（上述實機檢查已涵蓋主要項目）。
- M5：`/ddd.xreview` → 使用者授權後 commit。

## 2026-06-25 — M5：adversarial review 修復 + AC1c + 收尾

### Codex adversarial review（working tree，logic-only）
review 前先清雜訊讓 payload 可跑（原 >1MB 超 Codex 上限）：`.gitignore` 收 `.worktree/`（untracked 502→38）、commit content slug 資料（100 檔）與 handoff 截圖。Codex verdict：needs-attention，兩個 finding：

- **[high] cross-namespace leak**：`build-taxonomy-page-data.ts` 只在三型別全空時回 null，從不檢查 namespace；brand/tag 共用 `tag_ids` predicate → runtime `/tag/{brand}` 仍渲染 brand 內容，違反 ADR-10 單一 canonical。
- **[medium] id/slug 未強制 ASCII**：三個 content schema 的 id/slug 仍 `z.string().min(1)`，AC1c（ADR-11）尚未落實。

### 修復（ddd-developer，TDD）
- **Finding 1 / ADR-10 強化**：`build-taxonomy-page-data.ts` 加 `isSelectorIdInNamespace(input.taxonomies, selector)`，不符回 null→404；測試覆蓋 `/tag/{brand}`、`/brand/{tag}`、未知 channel/category id。
- **Finding 2 / AC1c**：`product-schema.ts` 新增 `content_id_schema`（`KEBAB_CASE_ASCII_ID_PATTERN`）套到 product/guide/link 的 id/slug；`git mv` CJK guide `2026-06-02-日本米入門篇` → `2026-06-02-japanese-rice-intro`（id/slug 同步）；`build-guide-routes.ts` 註解更新；新增 schema 拒絕測試、更新 `migrate-content-slug.test.ts`。

### 收尾決策
- **vitest .worktree 雜訊**：`vitest.config.ts` exclude `.worktree/**`——先前 56 個失敗 test file 是另一分支 worktree 的測試副本，非真失敗；排除後 gate 才可信。
- **移除 deprecated Google Sheet importer**（使用者裁決）：ASCII gate 與其 CJK slug 產出根本衝突；刪 `scripts/legacy/migrate-google-sheet-products.ts` + 測試，更新 README／AGENTS。`migrate-product-compact-schema.ts` 保留（獨立、測試綠）。

### 驗證
- 本機：`pnpm test` 512 passed（70 files）、`pnpm lint` clean（coordinator 親跑）。
- 待驗（Docker，AC19）：`typecheck`／`content:check`／`generate`；guide 公開 URL 變更為 `/guide/2026-06-02-japanese-rice-intro`（不 redirect），`sitemap.xml`／`rss.xml` 待 generate 重建。

### Commit
- 先行 3 commit（降 review 雜訊）：`chore: gitignore .worktree`、`content: add slug field`、`docs(027): handoff screenshots`。
- 「整包」commit：027 sprint 程式＋測試＋文件（M1–M5）一次提交。
