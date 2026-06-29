# 026 詳情頁體驗：商品 OG image + 指南內容化詳情頁

> 狀態：已確認放行，開發中（2026-06-23）
> 建立日期：2026-06-23
> 分支：`026-detail-pages`（自 `025-test-quality-cleanup` HEAD 開出，含 025 + content 未 commit 的改動；本 sprint commit 時只精準 add 本 sprint 相關檔案）

## 背景

這個 sprint 把「詳情頁體驗」一次補完整，涵蓋兩件主題相關的事：

1. **商品詳情頁 OG image**（原 026 範圍）：`products/[id].vue` 的 Open Graph／Twitter 圖目前寫死站台預設圖 `SITE_OG_IMAGE`，社群分享單一商品時 preview 看不到該商品自己的圖。
2. **指南內容化詳情頁**（新增範圍）：guide 目前只有 `summary` + `source_url`（外連 FB 貼文），列表 row 直接外連、**沒有站內 detail 頁、沒有內文**。要把內文搬回站內、新增 guide detail page，讓指南成為站內可瀏覽、可被搜尋引擎索引、可社群分享的第一方內容。

兩者的共同主題是「detail 頁體驗」，且有一個明確的順風車耦合：**guide detail 頁的 OG image 直接重用本 sprint 為商品做的 `getOgImageUrl()` 純函式**——而 guide 的 `image_file` 是選填（可能 null），`getOgImageUrl(null) → SITE_OG_IMAGE` 的 fallback 對 guide 是必要的真實 case。

### 現況事實（已調查確認）

- **路由 / SSG**：`nuxt.config.ts` nitro static preset，`prerender.routes` 明列 `/`、`/guide`、`/search`、`/links`、`/api/content.json`、`/search-index.json`，加上 `...product_routes`。`product_routes` 由 `scripts/build-product-routes.ts` 掃 `content/products/` 取 published 產生 `/products/{id}`。
- **guide 資料模型**（`product-schema.ts` `guide_schema`）：`id`、`status`、`title`、`summary`、`source_url`（**必填** http(s)）、`image_file`/`image_url`（互斥、選填、可都無）、`category_ids`、`tag_ids`、`related_product_ids`、時間戳。**無任何內文欄位**。
- **guide 列表 row**（`scripts/public-payload/map-resource-rows.ts:22-38`）：`href: source_url`、`external: true`、`target: '_blank'`——點擊跳外部。
- **product detail component**（`app/components/product-detail.vue`）：hero 圖 + 返回鈕、title、taxonomy pills（category/channel/tags）、price、「DW 怎麼說」、Markdown 內文渲染（`detail-llm-says`，行 86-171 用 `parseContentMarkdown`）、購買 CTA、相關商品 grid。guide 需要的子集為 hero、title、category/tag pills、Markdown 內文、看原文 CTA、相關商品。

## 目標

1. 商品詳情頁 `ogImage`/`twitterImage` 改用該商品 hero 圖絕對 URL，補 `ogImageAlt`/`twitterImageAlt`。
2. 新增純函式 `getOgImageUrl()`（product 與 guide 共用）。
3. guide schema 新增內文欄位，承載搬回站內的全文（Markdown）。
4. 11 篇 published guide 的內文搬全文回站內 JSON。
5. 新增 guide detail page `/guide/[id]`，沿用商品詳情頁版面，顯示 hero、內文、taxonomy、相關商品、看原文外連。
6. guide 列表 row 改為連站內 detail（`/guide/{id}`），detail 頁保留 `source_url` 作「看原文」外連。
7. guide detail 頁 OG image 重用 `getOgImageUrl()`（含 null fallback）。

## 非目標

- **不動 links / 首頁 / search 的 OG**：維持站台預設圖（列表頁慣例）。
- **不導入 OG image 生成套件**（satori／`@vercel/og`）：沿用本地圖。
- **不加圖片尺寸 gate**：商品／指南圖不驗證 1200×630，交社群平台縮放，有預設圖 fallback。
- **不處理 `data:` URI**：pipeline 不產生它（YAGNI）。
- **不改 guide 列表路由為複數**：detail 用 `/guide/[id]`，列表維持 `/guide`，避免動既有 canonical／SEO。
- **不重新設計詳情頁視覺**：沿用既有 `.detail-*`／`.related-products-*` 樣式（Styling SSOT）。
- **不為非本人內容搬全文**：內容遷移僅限使用者本人發布、無第三方版權疑慮的貼文（見 ADR-8）。

## 驗收條件

### A 區 — `getOgImageUrl()` 純函式

- **AC1**：相對路徑 `/products/images/x.jpg` → `https://dwselect.applepig.net/products/images/x.jpg`。
- **AC2**：無前導斜線 `products/images/x.jpg` → 同樣正確絕對 URL。
- **AC3**：前後帶空白 → trim 後正確。
- **AC4**：`''`／`null`／`undefined` → `SITE_OG_IMAGE`。
- **AC5**：已是絕對 URL（`http(s)://…`）→ 原樣回傳。

### B 區 — 商品詳情頁接線

- **AC6**：`products/[id].vue` 的 `ogImage`/`twitterImage` 由 `getOgImageUrl(product_detail.value?.hero_image_url)` 動態產生（computed，await 前同步註冊）。
- **AC7**：補 `ogImageAlt`/`twitterImageAlt`（= `hero_alt`，未載入時 fallback `SITE_NAME`）。
- **AC8**：商品未載入時 `ogImage` fallback `SITE_OG_IMAGE`。

### C 區 — guide schema 與內容遷移

- **AC9**：`guide_schema` 新增內文欄位 `body`（Markdown 字串，選填——見 ADR-6），通過 `pnpm content:check`。
- **AC10**：11 篇 published guide 的 `body` 填入內文 Markdown，內容完整、格式正確（標題／清單／連結可被 `parseContentMarkdown` 解析）。10 篇原創指南照搬全文；aeron-chair 依 ADR-8 只搬本人轉貼/評論 + 他人事件摘要。
- **AC11**：內容遷移後 `pnpm content:check` 與既有 content 測試全綠。

### D 區 — guide detail page

- **AC12**：新增 `/guide/[id]` 路由，published guide 皆可開啟；非 published guide 回 404（與 product 對稱）。
- **AC13**：`scripts/build-guide-routes.ts` 產生 published guide 的 `/guide/{id}`，併入 `nuxt.config` `prerender.routes`，`pnpm generate` 全數 prerender。
- **AC14**：detail 頁顯示 hero 圖（無圖則 fallback icon）、title、category/tag pills、內文（`body` 經 `ContentMarkdown` 渲染；`body` 為空則顯示 `summary`）、「看原文」外連（`source_url`）、相關商品 grid（`related_product_ids`，無則不顯示）。
- **AC15**：detail 頁 `ogImage`/`twitterImage` 用 `getOgImageUrl(guide hero)`，`ogImageAlt`/`twitterImageAlt` 用 guide title／hero alt；canonical 為 `/guide/{id}`。

### E 區 — guide 列表行為

- **AC16**：guide 列表 row 改為站內連結 `/guide/{id}`（`external: false`，移除 `target=_blank`），點擊進站內 detail 而非跳外部。

### F 區 — 品質 gate

- **AC17**：`pnpm test`（含新 unit test）、`pnpm lint` 本機全綠。
- **AC18**：`pnpm typecheck`、`pnpm content:check`、`pnpm generate` 通過（Docker／使用者環境）。
- **AC19**：generate 後 product 與 guide detail 的 static HTML `og:image`／`og:image:alt`／`twitter:image` 正確；實際開 product 與 guide detail 頁確認 head meta、內文渲染、相關商品、看原文連結無誤（Frontend Handoff）。

## ADR

### ADR-1：推翻 017「商品頁用站台預設 OG 圖」的決策
商品圖已 localize 為站內相對路徑，017 排除的「外部 URL／尺寸不適」疑慮消失；改用商品圖做 OG。017 該段成歷史決策，不回頭改檔，於本 spec 記錄推翻。

### ADR-2：`getOgImageUrl()` 只處理三類輸入
「空值 → fallback」「http(s) 絕對 → 原樣」「其餘相對 → `getCanonicalUrl` 組絕對」。不處理 `data:` 等不存在的 case（YAGNI）。放在 `app/utils/seo-metadata.ts`，重用 `getCanonicalUrl` 與 `SITE_OG_IMAGE`。

### ADR-3：頁面層 OG meta 不用 source-grep 測試
驗收主力為純函式 unit test；頁面接線靠 generate 後檢查輸出 HTML／實際開頁，不寫 grep 原始碼字串的脆弱測試（呼應 025 測試品質清理）。

### ADR-4：guide 新做 `GuideDetail` component，不重用 `ProductDetail`
guide 無 channel／price／buy_url／offer／fine_print，硬重用會塞滿 `v-if` 並讓 props 型別聯集，違反「避免過早抽象／最小正確修改」。新做 `GuideDetail`，共用既有 `.detail-*` 樣式（Styling SSOT，不另造）。

### ADR-5：抽出共用 `ContentMarkdown` component
product-detail.vue 內嵌約 70 行 `parseContentMarkdown` 渲染，guide 內文要用同一套。這是第二處使用 + 渲染邏輯複雜的穩定 domain concept，抽成 `app/components/content-markdown.vue` 合理。會動到 product-detail.vue（以既有測試／render 保護，行為不變）。
> 待確認：若你偏好最小變更不動 product-detail.vue，替代方案是 guide 自行複製該段渲染（較不 DRY）。預設採抽共用。

### ADR-6：`body` 選填、漸進遷移
`body` 設為選填（非 published 必填）。理由：避免 schema 一改必填就讓所有尚未遷移的 guide `content:check` 紅，遷移可逐篇進行；detail 頁以 `body` 為主、`summary` fallback。本 sprint 目標是 11 篇全部填上 `body`，但 schema 不強制，未來彈性更高（YAGNI，不過早強制）。

### ADR-7：路由命名 `/guide/[id]`
沿用既有單數 `/guide` 列表前綴，detail 為 `/guide/[id]`，不動列表路由，避免影響既有 canonical／SEO。與 product 的 `/products/[id]` 命名不完全對稱，屬可接受取捨。

### ADR-8：內容遷移範圍僅限本人內容
搬全文僅適用使用者本人發布、無第三方版權疑慮的貼文。若有引用他人內容的篇章，改為原創導讀 + 看原文外連（不搬全文）。遷移時逐篇確認。

具體 instance（2026-06-23 確認）：
- **aeron-chair**：body 只保留站長本人轉貼/評論的部分（「總之雅浩就別買了／不備料、不含運、不想賣」），其餘 PTT 網友 + 新聞報導的 Herman Miller 保固運費事件**改用站長自己的話摘要**，不照搬他人全文。
- 其餘 10 篇為站長原創指南，照搬全文。

## 邊界案例

- **product 未載入**：`getOgImageUrl(undefined) → SITE_OG_IMAGE`，preview 仍有圖。
- **guide 無圖**：`image_file`／`image_url` 皆 null，detail 頁顯示 fallback icon，OG 用預設圖。
- **guide 無 body**：detail 頁顯示 `summary`，不空白。
- **guide 無 related_product_ids / related 商品非 published**：相關商品區塊不顯示（對稱 product）。
- **非 published guide 被直開 `/guide/{id}`**：回 404（與 product 對稱），且不進 prerender 清單。
- **本機 runtime 限制**：本機只能跑 vitest／eslint；typecheck／content:check／generate／開頁面需 Docker 或使用者（見 `memory/host-cannot-validate-runtime.md`）。

## 驗證分工

- **本機可跑**：`pnpm test`（A 區純函式、可單元化的 mapper／schema 邏輯）、`pnpm lint`。
- **需 Docker／使用者**：`pnpm typecheck`、`pnpm content:check`、`pnpm generate`，及實際開 product／guide detail 頁檢查 meta、內文渲染、相關商品、看原文連結（Frontend Handoff）。

## Milestones

> M1–M2 = 商品 OG image（原 026，最小可獨立交付）；M3–M6 = 指南詳情頁；M4 內容遷移是最重、且依賴內文來源（見下方待確認）。

### M1：`getOgImageUrl()` 純函式 + 單元測試
- [ ] 測試（Red）涵蓋 AC1–AC5；實作（Green）於 `seo-metadata.ts`；`pnpm test`／`lint` 綠。

### M2：商品詳情頁接線
- [ ] `products/[id].vue` 接 `getOgImageUrl` + alt（AC6–AC8）；typecheck／generate（Docker）；開頁確認。

### M3：guide schema 加 `body` + 共用 `ContentMarkdown`
- [ ] `guide_schema` 加選填 `body`（AC9）；抽 `content-markdown.vue` 並讓 product-detail.vue 改用（ADR-5），既有測試保護行為不變。

### M4：內容遷移（11 篇搬全文）🔀 內容工作
- [ ] 逐篇把本人 FB 貼文全文整理成 Markdown 填入 `body`（AC10）；`content:check` 綠（AC11）。派 `dwselect-content-researcher`／`dwselect-content-authoring`，逐篇驗收。

### M5：guide detail page
- [ ] `build-guide-routes.ts` + prerender 併入（AC13）；`GuideDetailView` + `mapGuideDetail` + `useGuideDetailData`；`/guide/[id].vue` + `GuideDetail` component（AC12、AC14）；OG image 重用（AC15）。

### M6：guide 列表改站內連結
- [ ] `map-resource-rows.ts` guide row 改 `/guide/{id}`、`external: false`（AC16）。

### M7（選用）：搜尋索引納入 guide 內文
- [ ] 視需要把 `body` 納入 search index，提升指南可搜尋性（範圍待評估，可獨立後續）。

### M8：cross review + 收尾
- [ ] `/ddd.xreview`；更新 `works.md`；使用者授權後 commit（只 add 本 sprint 相關檔案，不碰 025／既有 content 未 commit 變更）。

## 待確認（影響 M4 可行性與工作量）

- **內文取得方式**：11 篇原文目前在 `source_url`（`facebook.com/share/p/…`）。FB 貼文多需登入＋JS render，`WebFetch` 高機率抓不到。需確認內文如何進站：你逐篇提供／你有既有備份批次匯入／嘗試自動抓取（風險高）。
