# Sprint 007 — Research：路由化 + View Transition

調研日期：2026-06-07。來源以 MDN、web.dev、developer.chrome.com、Nuxt 4 官方文件與 GitHub PR、Baseline 為準。

本 sprint 兩個訴求：(1) 把單頁狀態機搬進路由拿到 perma url、(2) 接上 Nuxt 內建 view transition、讓「列表→詳情」與「切換分類 / 篩選」都自然。本文件回答「單一元素 view transition 現在能做到什麼程度」與「Nuxt 4 路由化怎麼接」。

## TL;DR 對本專案的結論

- **使用者想要的「分類切換更自然」不需要等 scoped VT。** 真正的 element-scoped `element.startViewTransition()` 還是 Chromium only（Chrome 147，2026-03），Firefox / Safari 都沒有，**不可當核心依賴**。但「同頁列表因 filter 重排時的自然進出 / 位移補間」用 **`match-element` + `view-transition-class` + 把 DOM 變更包進 `document.startViewTransition()`** 就能做到，而且這套已是 **Baseline Newly available（2025-10）**，三大引擎都支援。這是本 sprint 的主力手法。
- **主結構走 path，次要狀態走 query。** `/`、`/guide`、`/search`、`/links`、`/products/:id` 走 path（perma url + SEO + 方向性轉場）；篩選 / 排序 / 搜尋關鍵字走 query。
- **研究階段曾評估 route-driven modal，但最終實作以 `spec.md` ADR 1 為準：商品詳情採獨立 route page。** 兩種做法都能拿到 `/products/:id` perma url 與列表卡片 / 詳情 hero 的同名 `view-transition-name` morph；本 sprint 最終排除 route-driven modal，避免引入背景 route、child route 或額外 module 複雜度。
- **Nuxt 內建 `experimental.viewTransition: true` 與 `nitro.preset: 'static'` 完全相容**，走的是 same-document（client-side 路由）路徑，且自帶 reduced-motion 尊重與 feature-detect fallback。

## A. 單一元素 / Scoped View Transition 的 2026 現況

| 功能 | Chrome | Firefox | Safari | Baseline | 本專案可用性 |
|------|--------|---------|--------|----------|------------|
| Same-document VT | 111 | 144 | 18 | ✅ Newly available（2025-10） | ✅ 主路徑 |
| `view-transition-name: match-element` | 137 | 144 | 18.4 | ✅ Newly available | ✅ 列表重排主力（SPA 限定） |
| `view-transition-class` | 137 | 144 | 18.4 | ✅ Newly available | ✅ 批次樣式化卡片群 |
| `:active-view-transition-type()` | 111 | 144 | 18 | ✅ Newly available | ⚠️ Firefox 初版不含 types，當 PE |
| Nested groups | 140 | ✗ | ✗ | ❌ Chromium only | ⚠️ 純加分，不可必需 |
| `document.activeViewTransition` | 142 | 147 | 26.2 | ⚠️ 三引擎都有但太新 | ⚠️ 需 feature-detect |
| Scoped VT `element.startViewTransition()` | 147 | ✗ | ✗ | ❌ Chromium only（2026-03） | ❌ 不依賴 |

關鍵點：
- `match-element` **僅限 same-document（SPA）**，cross-document 因新舊文件元素身份不同而無法使用——本專案是 SPA，完全符合。
- `view-transition-class` 是「批次樣式掛勾」，每個元素**仍需各自唯一的 `view-transition-name`**（可用 `match-element` 自動產生）。

可採用範例：

```css
@media (prefers-reduced-motion: no-preference) {
  .product-card {
    view-transition-name: match-element;   /* 自動命名，免手動配 product-image-${id} */
    view-transition-class: card;           /* 批次樣式掛勾 */
  }
}

::view-transition-group(.card) {
  animation-duration: 0.3s;
  animation-timing-function: ease;
}
```

## B. 同頁列表重排（分類 / 篩選切換）的轉場 pattern

- **標準做法**：在會被 filter 變動的 grid 項目上掛 `match-element` 命名 + 共用 `view-transition-class`，改變 filter / 排序時把 DOM 變更包進 `document.startViewTransition(callback)`。瀏覽器自動處理：留存項目 → 位移補間、移除項目 → exit、新增項目 → enter。
- **Vue / Nuxt 注意**：`startViewTransition` 的 callback 需等 DOM 真的更新完，Vue 裡通常要 `await nextTick()`，或改用 Nuxt 內建路由整合讓 Nuxt 代為包裝。
- **效能**：每個 snapshot 是一張合成層點陣圖，同時轉場越多越吃 GPU / 記憶體。實務建議：只對視口內 / 鄰近項目命名（避免一次 morph 上百個）、duration 壓在 0.2–0.35s、大列表可只對少數 hero 做真正 morph、其餘走 root cross-fade。
- **reduced-motion 正解**：把 `view-transition-name` 宣告包進 `@media (prefers-reduced-motion: no-preference)`，偏好 reduce 者自動退回 root cross-fade；另加保險絲 `animation: none`。

```js
function applyFilter(next_filter) {
  if (!document.startViewTransition) {
    product_list.value = computeList(next_filter) // fallback：直接換
    return
  }
  document.startViewTransition(() => {
    product_list.value = computeList(next_filter)
  })
}
```

## C. Nuxt 4 路由化 + 內建 View Transition 整合

- **`experimental.viewTransition` 三態**：`false` 停用；`true` 啟用且尊重 `prefers-reduced-motion: reduce`（官方推薦）；`'always'` 強制啟用、需自行處理 reduce；物件 `{ enabled, types }` 進階設定。
- **View Transition Types**（PR #31982，2026-02 合併，已進官方文件）：
  - 全域 `app.viewTransition: { enabled, types }` 只接受靜態 `string[]`。
  - 每頁 `definePageMeta({ viewTransition: { enabled, types, toTypes, fromTypes } })`，`toTypes` / `fromTypes` 支援動態函式 `(to, from) => string[]`（函式形式只能用在 `definePageMeta`）。
  - CSS 端 `html:active-view-transition-type(slide-left) { … }` 對應。
  - ⚠️ Firefox same-document 初版**不含 types**，方向性動畫在 Firefox 退回 cross-fade，**當 progressive enhancement**。
- **與 Vue `<Transition>` 衝突的官方解法**：

```ts
// middleware/disable-vue-transitions.global.ts
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || !document.startViewTransition) return
  to.meta.pageTransition = false
  to.meta.layoutTransition = false
})
```

- **`hasUAVisualTransition`（PR #31945 / #31938）已內建**：瀏覽器提供原生手勢轉場（Safari swipe-back）時 Nuxt 自動 `skipTransition()` 防雙重轉場。走 Nuxt 內建即免費獲得，不需自己寫。
- **static generate 適用性**：Nuxt 內建 `experimental.viewTransition` 在 `router.beforeResolve` 包 `document.startViewTransition`，走 **same-document（client-side 路由）**，與 `nitro.preset: 'static'` 完全相容（靜態只是預先 render，hydrate 後仍是 SPA）。**Cross-document（`@view-transition { navigation: auto }`）** 是針對整頁 reload 的 MPA 模型，與內建 same-document 互斥，且 Firefox 未預設啟用——**本專案用內建 same-document，不採 cross-document**。
- **modal vs route page**：純 ref-based `<UModal>` 拿不到 perma url。研究階段評估過 route-driven modal：點商品 → `navigateTo('/products/:id')` 更新 URL → 背景 route + modal child route 呈現；直接貼網址則 render 完整頁。但最終 `spec.md` ADR 1 已決定採標準獨立 route page，不採 route-driven modal。
- **path vs query**：主結構（四個 tab、商品詳情）走 path——Nuxt 內建 VT 與 types 函式 `(to, from)` 都吃 route param，方向性動畫、shared-element morph 靠 path 才自然，SEO 也友善。篩選 / 排序 / 搜尋字串走 query。

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  experimental: { viewTransition: true }, // 尊重 reduced-motion
})
```

## 採用決策

**可安全採用（Baseline，直接上）**：
- Nuxt `experimental.viewTransition: true`（基礎 cross-fade + reduced-motion）。
- `match-element` + `view-transition-class` 列表重排與卡片群批次樣式（SPA same-document 限定）。
- 列表→詳情 shared-element morph（兩端同名 `view-transition-name`）。
- 官方 middleware 停用 Vue page/layout transition。
- `hasUAVisualTransition` 防雙重轉場（Nuxt 內建自動）。
- View Transition Types 方向性動畫——當 **progressive enhancement**（Firefox 初版不支援會退回 cross-fade，務必確保沒有 types 也能看）。

**必須 fallback / 暫不依賴**：
- Scoped VT `element.startViewTransition()`：Chromium only，未 Baseline，不建核心轉場於其上。
- Nested groups：Chromium only，純加分。
- `document.activeViewTransition`：三引擎都有但版本太新，使用前 feature-detect。
- Cross-document：與內建 same-document 互斥，Firefox 未預設，不採。

## 對既有 code 的影響點

- `nuxt.config.ts`：新增 `experimental.viewTransition: true`。
- `app/pages/index.vue`：單頁狀態機要拆成多個 route page（`/`、`/guide`、`/search`、`/links`），tab 狀態從 ref 改由 route 驅動；商品 detail 從 ref + UModal 改 route-driven。
- `app/components/product-card.vue`：現有手動 `view-transition-name: product-image-${id}` 維持唯一命名（跨頁 hero morph 需兩端同名，`match-element` 無法跨 route 配對，最終決策見 spec ADR 4）；點擊改 `NuxtLink` / `navigateTo`。
- `app/components/product-detail.vue`：移出 `<UModal>` 專用結構，改為獨立 detail page 可重用的 presentational component；hero image 需補對應 `view-transition-name` 才有 morph。
- `app/utils/view-transition.ts`：手寫 `runViewTransition` 在路由切換改走 Nuxt 內建後可能只剩同頁 filter 重排場景使用，需重新定位其角色。
- `app/assets/styles/catalog.css`：現只調 root cross-fade，需補列表 group / shared-element 的轉場樣式與 reduced-motion 保險絲。
