# 026 works

> SSOT：`spec.md`。本檔為工作紀錄。

## 前置（已完成）

- **內容抓取**（2026-06-23）：派 agent 用 `agent-browser`（headless Chrome，override `~/.agent-browser/config.json` 的 cdp 設定）抓取 11 篇 published guide 的 FB 貼文 verbatim 原文，存於 scratchpad `guide-bodies/{id}.md`（未碰 content JSON）。11/11 成功、無登入牆。抽查 dishwasher／vacuum／aeron-chair 品質良好、非 AI 改寫。
  - 注意：`日本米入門篇` 的草稿檔名為 `2026-06-02-japanese-rice.md`，但 JSON id 是中文 `2026-06-02-日本米入門篇`，M4 填入時須對應正確檔。
  - aeron-chair 依 ADR-8 特殊處理（body 只保留本人轉貼/評論 + 他人事件摘要）。

## Milestone 進度

| M | 內容 | 狀態 |
|---|------|------|
| M1 | `getOgImageUrl()` 純函式 + test | ✅ 完成（seo-metadata.ts；tests/seo-metadata.test.ts 10 passed；lint 綠） |
| M2 | 商品詳情頁接線 | ✅ 完成（[id].vue 接 getOgImageUrl + alt；launch-seo 作廢斷言已移除） |
| M3 | guide schema 加 body + 抽 ContentMarkdown | ✅ 完成（schema body 選填；新增 content-markdown.vue + render 測試；product-detail 改用） |
| M4 | 11 篇內容遷移 | ✅ 完成（11 篇 body 填入 JSON、連結補正；content:check 63 passed） |
| M5 | guide detail page | ✅ 完成（全鏈路；guide.vue→guide/index.vue；payload.guides 改 {rows,details_by_id}） |
| M6 | guide 列表改站內連結 | ✅ 完成（href→/guide/{id}、external:false；測試更新） |

| M7 | 搜尋索引納內文（選用） | 待辦 |
| M8 | xreview + 收尾 | ✅ 完成（`/code-review` + 修正 + agent-browser 驗證，見下） |

## Review 修正（2026-06-23，`/code-review` 後）
- ✅ **#1 useRouter 位置**：`guide-detail.vue` 的 `const router = useRouter()` 由 `onBackClicked` handler 內提到 setup 頂層（對齊 product-detail.vue），避免 event handler 內取不到 Nuxt context 而拋 `[nuxt] instance unavailable`。`tests/guide-detail-render.test.ts` 補 `useRouter` stub；新增 `tests/guide-detail-back-navigation.test.ts`。
- ✅ **#3 guide detail breadcrumb**：`use-catalog-shell-data.ts` 補 `guide_details_by_id`；`default.vue` 加 `/guide/[id]` 分支（`指南`→/guide、再 guide.title），`getRouteProductId`→`getRouteId` 共用。`nuxt-smoke.test.ts` 補對應斷言。
- ✅ **順手修測試**（屬 025 M1 範疇，本 sprint 先止血）：`tests/dev-server-script.test.ts` 的 `scripts.dev` 由 `toBe('nuxt dev')` 放寬為 `toContain('nuxt dev')`（dev script 已前置 `assert-in-container.mjs` 守門），保留 `--host` 斷言。`pnpm test` 回綠（54 files / 399 passed）。
- ⏸️ **暫緩**：guide-detail.vue 與 product-detail.vue 重複的純邏輯（`canReturnToSameOriginPage`/`isBrokenImage`）抽取——依使用者指示暫不抽（第 2 次重複，未達抽象門檻）。
- ⏸️ **非阻塞**：`guide-detail.vue` hero tile 缺 `view-transition-name`（experimental.viewTransition 目前關閉）。

## 已驗證（agent-browser，對 dev 容器）
- ✅ guide 列表→站內 `/guide/<id>` detail；breadcrumb `DW嚴選 › 指南 › 標題`（指南連回 /guide）。
- ✅ 返回鈕點擊：`/guide/<id>`→`/guide`，console 無 error（確認 useRouter 修正生效）。
- ✅ detail 內文（ContentMarkdown）、看原文、無圖 fallback icon 正常。

## 待 Docker/使用者驗證（AC18/AC19）
- `pnpm generate`（最高風險：中文 id route `/guide/2026-06-02-日本米入門篇` 的 CJK prerender，failOnError 會中止）——dev 容器執行中，host 不可跑 generate，待容器內或停容器後驗。
- product/guide detail 的 OG meta（social crawler 視角）。
