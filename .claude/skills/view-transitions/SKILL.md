---
name: view-transitions
description: >
  View Transition API 在 Nuxt 中的實作參考。涵蓋 Nuxt 內建支援、瀏覽器新功能、
  常見 pattern 與本專案適用的商品列表/詳情轉場設計。
  Trigger: "view transition", "頁面轉場", "page transition animation",
  "轉場動畫", /view-transitions。
---

# View Transition API — Nuxt 實作參考

本文件是 DW嚴選專案的 View Transition 技術參考，供 Sprint 2（Public Site UI + Search）實作時使用。

## Nuxt 內建支援

### 啟用方式

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  experimental: {
    viewTransition: true, // boolean | 'always' | ViewTransitionOptions
  },
})
```

- `true`：啟用，尊重使用者的 `prefers-reduced-motion: reduce`（建議）
- `'always'`：強制啟用，忽略使用者動畫偏好
- 物件：進階設定（見下方 View Transition Types）

### View Transition Types（2026-02 合併，PR #31982）

支援根據導航方向套用不同動畫。

全域設定：

```ts
export default defineNuxtConfig({
  experimental: {
    viewTransition: {
      enabled: true,
      types: ['slide'],
    },
  },
})
```

每頁設定（支援動態函式）：

```ts
definePageMeta({
  viewTransition: {
    enabled: true,
    toTypes: (to, from) => {
      return Number(to.params.id) > Number(from.params.id)
        ? ['slide-left']
        : ['slide-right']
    },
    fromTypes: ['fade-out'],
  },
})
```

對應 CSS：

```css
html:active-view-transition-type(slide-left) {
  &::view-transition-old(root) {
    animation: slide-out-left 0.3s ease-in-out;
  }
  &::view-transition-new(root) {
    animation: slide-in-right 0.3s ease-in-out;
  }
}
```

### Runtime Hook

```ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('page:view-transition:start', (transition) => {
    console.log([...transition.types])
  })
})
```

### 注意事項

- Nuxt **沒有** `useViewTransition` composable，控制完全透過 config 和 `definePageMeta`
- `<NuxtPage>` **沒有** `viewTransition` prop

## 瀏覽器新功能（2025–2026）

### Same-Document Transitions — Baseline Newly Available（2025-10）

Chrome 111+、Edge 111+、Firefox 144+、Safari 18+。

### Cross-Document Transitions（MPA）

Chrome 126+、Edge 126+、Safari 18.2+。Firefox 尚未預設啟用（Interop 2026 重點）。

啟用只需 CSS：

```css
@view-transition {
  navigation: auto;
}
```

### 重要新功能

| 功能 | 瀏覽器 | 說明 |
|------|--------|------|
| `view-transition-name: match-element` | Chrome 137+, Firefox 144, Safari 18.4 | 自動以元素身份命名，不需手動指定唯一名稱 |
| `view-transition-class` | Chrome 139+ | 用一條規則樣式化一群 snapshots |
| Nested View Transition Groups | Chrome 140+ | 轉場保留 DOM 層級，支援 clipping 和 3D |
| `document.activeViewTransition` | Chrome 142+, Firefox 147, Safari 26.2 | 存取當前 active transition |
| Scoped View Transitions | Chrome 147 | `element.startViewTransition()` 元素級別轉場，可多個同時 |

### `match-element` 對商品列表的意義

列表動畫不再需要手動分配唯一 `view-transition-name`：

```css
.product-card {
  view-transition-name: match-element;
  view-transition-class: card;
}

::view-transition-group(.card) {
  animation-duration: 0.3s;
}
```

限制：僅限 same-document transitions（SPA），跨文件時元素身份不同。

## 常見 Pattern

### 停用 Vue Transition 避免衝突

View Transitions API 在執行期間會凍結 DOM 更新，與 Vue `<Transition>` 衝突：

```ts
// middleware/disable-vue-transitions.global.ts
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || !document.startViewTransition) return
  to.meta.pageTransition = false
  to.meta.layoutTransition = false
})
```

### 列表到詳情的轉場

只在點擊的元素上動態設定 `view-transition-name`：

```vue
<template>
  <div
    v-for="item in items"
    :key="item.id"
    :style="{
      viewTransitionName: activeId === item.id ? `item-${item.id}` : 'none'
    }"
    @click="activeId = item.id; navigateTo(`/items/${item.id}`)"
  >
    {{ item.title }}
  </div>
</template>
```

或使用 `match-element`（Chrome 137+, Firefox 144, Safari 18.4）：

```css
.product-card {
  view-transition-name: match-element;
}
```

### 資料載入與轉場的衝突

View Transitions 凍結 DOM，heavy data fetching 會延遲轉場。建議：

- 使用 `useLazyFetch` / `useLazyAsyncData` 搭配 `lazy: true`
- 或用 `page:view-transition:start` hook 配合 `transition.finished` 延遲操作

### 方向性動畫

利用 View Transition Types 實現前進/後退不同動畫：

```ts
definePageMeta({
  viewTransition: {
    enabled: true,
    toTypes: (to, from) => {
      if (!from.params.id) return ['fade-in']
      return Number(to.params.id) > Number(from.params.id)
        ? ['slide-left']
        : ['slide-right']
    },
  },
})
```

### UA 原生轉場偵測

Nuxt 已內建 `hasUAVisualTransition` 偵測（PR #31945）。Safari swipe-back 等手勢時自動跳過自訂 transition。

## 社群方案

### vue-view-transitions（by Clarkkkk）

提供 `v-view-transition-name`（別名 `v-trans`）directive 和 `startViewTransition()` 程式化控制：

```ts
export default defineNuxtConfig({
  modules: ['vue-view-transitions/nuxt'],
  experimental: { viewTransition: true },
})
```

動態 toggle：`v-trans="{ title: someBoolean }"`

注意：最後一次發布已超過一年，活躍度不高。優先使用 Nuxt 原生支援。

## DW嚴選適用場景

Sprint 2 可考慮的轉場：

1. **首頁 → 商品詳情**：商品卡片圖片 morph 到詳情頁大圖（`match-element` 或動態 `view-transition-name`）
2. **分類切換**：fade 或 slide 轉場
3. **搜尋結果展開/收合**：search panel 開關動畫
4. **篩選/排序**：列表重排動畫（`view-transition-class` 批次處理）

建議先用 `experimental.viewTransition: true` 啟用基礎 fade，再逐步加入特定元素轉場。

## 參考來源

- [Nuxt Transitions 文件](https://nuxt.com/docs/getting-started/transitions)
- [Nuxt Experimental Features](https://nuxt.com/docs/guide/going-further/experimental-features)
- [PR #31982: View Transitions Types](https://github.com/nuxt/nuxt/pull/31982)
- [PR #34515: handle rejected promise in view transition abort](https://github.com/nuxt/nuxt/pull/34515)
- [PR #31945: skip view transition if UA provides one](https://github.com/nuxt/nuxt/pull/31945)
- [What's new in view transitions (2025) — Chrome Blog](https://developer.chrome.com/blog/view-transitions-in-2025)
- [View Transition API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [vue-view-transitions](https://github.com/Clarkkkk/vue-view-transitions)
