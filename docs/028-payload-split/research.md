# Research：在 Nuxt 上「更靜態」能走多遠？（與 028 的關係）

> 本文回答使用者疑問：「拋棄 Nuxt Content 之後，是不是還背著太多 Nuxt SPA framework 的包袱？怎麼讓這個 project 盡可能接近純靜態站（理想是靜態 HTML + 極少甚至零 client JS）？」
>
> 研究方法：本環境無既有 `.output/` 產物（不可在 host 重 build），故 client bundle 構成以 `package.json` deps、`nuxt.config.ts`、`app/` 實際用法推斷，量化體積引用 `docs/018-static-generate-performance/spec.md` 的實測 baseline，並標註「推斷」與「實測」。內容規模已從 018 的 62 商品成長到目前 **87 商品 / 11 指南 / 2 連結**（`content/` 統計），payload O(N) 問題比 018 當時更嚴重。

---

## TL;DR（觀點先行）

1. **028 的方向（payload 拆分）是對的，但它只解決「資料層」的 O(N) 膨脹，沒碰到「runtime 層」的固定包袱。** 真正讓這站「不像靜態站」的，是每頁都要下載並執行一份完整 Vue + Nuxt + vue-router app 來做 hydration——這份 runtime 不隨內容縮放，是固定稅。028 把資料變瘦，但 framework runtime 還在。

2. **這站的互動量極少，且高度集中。** 全站需要 client JS 的互動只有四類：搜尋（minisearch，已 lazy fetch、僅搜尋頁）、首頁分類 filter（純 query string 導航）、主題切換（cookie 持久化）、詳情頁的兩個漸進增強（圖片載入失敗 fallback、智慧返回鈕）。其餘頁面內容本質上是「印出來就結束」的靜態 HTML。**用一個全站 SPA runtime 去承載這點互動，是殺雞用牛刀。**

3. **最高槓桿的單一改動是 `experimental.noScripts`（對特定 route 關閉 hydration script）**，但它與目前「全站靠 Vue Transition 換頁、client filter 導航、ColorModeButton」的設計直接衝突——不能無腦全站開。務實路線是**分頁決定靜態程度**：詳情頁／指南／連結頁可以走「近乎零 JS」，首頁與搜尋頁保留 island 等級的互動。

**首要建議：028 照原計畫做完（它是地基且風險低），但把它重新定位成「靜態化計畫的第一階段」，緊接著做 028.5「runtime 瘦身」——以 `routeRules` + 選擇性 `noScripts` 讓 detail/guide/links 走零或極少 JS。換 stack（Astro/11ty）列為長期選項，短期不划算。**

---

## 1. 現況產物盤點

### 1.1 依賴與 runtime 來源

| 來源 | 套件 | 進 client bundle？ | 推斷體積（gzip）| 備註 |
|---|---|---|---|---|
| Vue 3 runtime | `vue@3.5` | 是，每頁 | ~34KB | reactivity + runtime-dom，hydration 必需 |
| Nuxt app runtime | `nuxt@4.4`（`#app`：nuxt-root、plugins、hooks、payload revive）| 是，每頁 | ~20–30KB | Nuxt 的「黏著層」 |
| vue-router | `nuxt` 內建 | 是，每頁 | ~12–18KB | client-side routing + `<NuxtLink>` |
| Nitro client（payload fetch / prefetch）| `nuxt` 內建 | 是，每頁 | ~5KB | `_payload.json` revive、prefetch 排程 |
| Nuxt UI | `@nuxt/ui@4.8` | 是（tree-shaken 後僅用到的元件）| 中等，見 1.3 | 含 `@nuxt/icon`、Reka UI、Tailwind v4 runtime |
| @nuxt/icon | `@nuxt/ui` 內含 | 是 | 小（見 1.3）| 15 個 lucide icon |
| @nuxt/image | `@nuxt/image@1.10` | runtime component 輕、IPX 在 build 端 | 小 | SSG 走 `ipxStatic`，圖片 build 時產出 |
| minisearch | `minisearch@7.2` | **僅搜尋頁 lazy 載入** | ~8KB | `client-search.ts` 動態 `fetch('/search-index.json')`，非首屏 |
| @vueuse/core | `useStorage`（搜尋歷史）| 是（tree-shaken）| 小 | 僅搜尋頁用到 storage |
| zod | `zod@4` | **不進 client** | 0 | 只在 build 端 `content-reader` / schema 驗證 |

> 重要修正 vs 018：**SQLite WASM（~1.7MB）已在 018 移除**，這是過去最大的「不靜態」包袱，現已不存在。剩下的是 framework runtime 這類「較小但固定」的稅。

### 1.2 018 實測 baseline 的可重用數字

018 spec 的實測重點（62 商品時）：

- `_nuxt/` 曾含兩份 byte-identical `sqlite3*.wasm`（各 856KB）+ worker（~197KB）→ **已隨 Nuxt Content 移除**。
- 每頁 `products/<id>/_payload.json` 各 **83KB**（內嵌全 catalog）→ **這正是 028 要解決的**；087 商品時單頁 payload 會更大（spec 提到研究實測 ~308KB 級別）。
- `public/api/content.json` 完整 catalog **108KB**（含 details_by_id）。

### 1.3 Nuxt UI 實際用量（決定它值不值得留）

實際只用到 **8 種 Nuxt UI 元件**，多數可被原生 HTML 取代：

```
11 <UButton      → 分類 chip（首頁）、返回鈕（詳情）。可用原生 <button>/<a> + CSS
 9 <UIcon        → 15 個 lucide icon。可改 inline SVG，去掉 icon runtime
 5 <UEmpty       → 空狀態。純靜態 markup，可自寫
 2 <UApp         → Nuxt UI 根 provider（toast/tooltip context）。幾乎沒用到其功能
 1 <UInput       → 搜尋框。搜尋頁需要
 1 <UColorModeButton → 主題切換。需要 client JS
 1 <UCard        → 單處。可自寫
 1 <UAlert       → 單處（error?）。可自寫
```

**觀點：Nuxt UI 在這站的「使用密度」極低，幾乎只是為了 8 個元件背了一整套 design system runtime（Reka UI primitives + Tailwind v4 + icon engine + `<UApp>` provider）。** 這是除了 framework runtime 之外第二大的可削減目標。`UButton`/`UEmpty`/`UCard`/`UAlert`/`UIcon` 都可用 `catalog.css` 既有 BEM class + inline SVG 取代；真正需要 Nuxt UI 的只剩搜尋頁的 `UInput` 與主題鈕。

---

## 2. Hydration / payload 機制成本

### 2.1 Nuxt SSG 一個頁面的生命週期

1. 瀏覽器拿到 prerender 好的 **靜態 HTML**（首屏內容已在裡面，SEO/LCP 友善）。
2. HTML 末端載入 `entry.*.js`（Vue+Nuxt+router runtime）+ 該 route 的 page chunk。
3. Nuxt 抓 `_payload.json`（該頁的序列化資料）→ **revive** 成 reactive state。
4. Vue 對既有 DOM 做 **hydration**：重建整棵 component tree、掛上 event listener、比對 SSR 標記。
5. `<NuxtLink>` 進入視窗 → **prefetch** 目標 route 的 chunk 與 `_payload.json`。

### 2.2 哪些對純靜態內容站是「不必要的稅」

| 機制 | 成本 | 對本站必要性 |
|---|---|---|
| **下載 + 解析 + 執行 framework runtime（每頁）** | ~70–90KB gzip JS + parse/execute | 詳情/指南/連結頁：**不必要**。內容印完就結束，沒有 reactive 互動 |
| **hydration（重建整棵 tree）** | CPU，低階手機明顯 | 同上，多數頁不必要 |
| **`_payload.json` 二次往返** | 一次額外 request + revive | 資料其實已在 HTML 裡能渲染；payload 主要服務 client 接管。詳情頁尤其浪費（028 後雖瘦，但仍是「為了 hydration 而存在」） |
| **`<NuxtLink>` 自動 prefetch** | 背景下載大量 chunk/payload | 站內連結多（導航 sidebar + bottom tabs 每頁 ~8 個 link + 卡片）→ 首頁一進站就狂 prefetch。018 研究已點名「首頁狂 prefetch」是載入慢主因之一 |
| **client-side routing** | router runtime | 換頁體驗較順，但純靜態站用瀏覽器原生導航也完全可用 |

**結論：對 detail/guide/links 這類「讀完即走」的頁，步驟 2–5 全部是淨成本。** 它們存在的唯一理由是「讓這站表現得像 SPA」（換頁不刷新、Vue Transition 動畫、client filter）。這是一個**產品體驗決策**，不是技術必需——是否願意放棄它，是後續所有方案的分水嶺。

---

## 3. 頁面 × 互動 × 可否去 JS 對照表

| 頁面 | 真正需要 client JS 的互動 | 可純 HTML / 零 JS？ | 說明 |
|---|---|---|---|
| **首頁 / 列表**（`index.vue`）| 分類 chip filter（`router.push` 改 query）、進場 `<Transition>` 動畫 | **半可**：filter 可改成純 `<a href="/?category=x">`（已是 query 導航，本來就能 SSG 出每個分類的靜態結果），動畫可放棄 | filter 目前靠 client `getCompactAppView` 重算，但每個分類組合都能 prerender 成靜態頁。去 JS 需把 filter 改成連結 + 預產分類頁 |
| **商品詳情**（`products/[id].vue`）| 圖片載入失敗 fallback（`onMounted` + `ref`）、智慧返回鈕（讀 `window.history`）| **幾乎可**：兩者都是漸進增強。圖片 fallback 可用 `<img onerror>` inline；返回鈕可退化成普通 `<a href="/">` | 內容 100% 靜態。這是**最該去 JS 的頁**，數量也最多（87 頁） |
| **指南詳情**（`guide/[id].vue`）| 同詳情頁（圖片 fallback + 返回鈕）| **幾乎可** | 同上，11 頁 |
| **指南列表**（`guide/index.vue`）| 無真互動，只渲染 rows | **完全可** | 純清單，零互動 |
| **連結**（`links.vue`）| 無真互動，外部連結 `<a>` | **完全可** | 純清單，零互動 |
| **搜尋**（`search.vue`）| minisearch query、輸入框、歷史（localStorage）、suggestion | **否** | 這是唯一「本質上需要 client JS」的頁。但已做對：minisearch 與 index 都 **lazy fetch**，不污染其他頁首屏 |
| **全站 layout / 導航**（`default.vue` / `app-navigation.vue`）| active 狀態高亮、麵包屑 | **半可**：active 高亮可純 CSS（用 `aria-current`／path class），麵包屑可由 SSR 算好印死 | 目前靠 `useRoute()` reactive 算 active，但 SSG 每頁的 active 是固定的，可在 prerender 時印死 |

**一句話總結：6 類頁面中，4 類（詳情、指南詳情、指南列表、連結）可走「零或極少 JS」；首頁是「半可」（需把 filter 改連結）；只有搜尋頁真正需要 client JS——而它已經被隔離得很好。**

---

## 4. Nuxt 減負方案光譜（保守 → 激進）

### 方案 A（保守）：關閉 / 限縮 prefetch
- **做法**：`<NuxtLink :prefetch="false">` 或全站 `defaults.nuxtLink.prefetch=false`；或改 `prefetchOn: 'interaction'`（hover 才抓）。
- **效益**：直接砍掉 018 點名的「首頁狂 prefetch」背景流量；首屏更早穩定。
- **取捨/風險**：站內換頁第一次會略慢（要現抓 chunk）。風險極低，不破壞任何功能。
- **本站適用**：**強烈建議，立即可做。** 導航每頁 8+ link，prefetch 收益小、成本大。

### 方案 B（保守）：精簡 Nuxt UI / 換 inline SVG
- **做法**：把 `UButton/UEmpty/UCard/UAlert/UIcon` 換成 `catalog.css` class + inline SVG（15 個 icon 直接內嵌）；只在搜尋頁保留 `UInput`、主題鈕保留 `UColorModeButton`。評估能否移除 `@nuxt/icon` runtime。
- **效益**：砍掉 design system runtime 與 icon engine 的固定體積（1.3 節）。
- **取捨/風險**：要動不少 template；需確保樣式 SSOT（CLAUDE.md 規定）不被破壞。中度工。
- **本站適用**：**建議，中期。** 使用密度太低，CP 值高。

### 方案 C（中度）：`routeRules` 預渲染 + 分類靜態頁
- **做法**：`routeRules` 對列表頁設定每個分類組合 prerender；首頁 filter 從 client 重算改成 `<a href>` 連結到預產的分類頁。
- **效益**：首頁 filter 不再需要 client 重算邏輯（`getCompactAppView` 那段可不進 client）。
- **取捨/風險**：分類頁數量 = 分類數，需納入 prerender route 清單；filter「即時」感變成換頁。
- **本站適用**：可行，但要先確認使用者願意放棄即時 filter 動畫。

### 方案 D（激進，最高槓桿）：選擇性 `experimental.noScripts`
- **做法**：對 detail/guide/links 這些「讀完即走」的 route 套 `noScripts`（透過 `routeRules` 或 per-page）——Nuxt **不注入任何 hydration script**，純送 SSR HTML。
- **效益**：這幾百頁（87+11+列表）變成**真・零 client JS**。這是把「靜態站」做實的關鍵一招。
- **取捨/風險**：
  - 該 route 上**所有 client 互動失效**——詳情頁的圖片 fallback、智慧返回鈕、Vue Transition、client routing 全沒了。圖片 fallback 可用 `<img onerror>` inline 補回；返回鈕退化成 `<a href="/">`；換頁變瀏覽器原生（整頁刷新）。
  - `<UColorModeButton>` 等需 JS 的元件不能出現在 noScripts 頁（主題切換得改 inline script 或放棄該頁切換）。
  - 與目前「全站 SPA 換頁 + Transition」的產品體驗直接衝突，**不能全站無腦開**。
- **本站適用**：**這是「更靜態」的核心手段，但必須分頁決策。** 建議先在 links/guide list 試點（互動為零），再評估 detail。

### 方案 E（激進）：Nuxt Server Components / Islands
- **做法**：把互動孤島（搜尋、主題鈕）做成 island，其餘 server component 不送 JS。
- **效益**：理論上最乾淨的「靜態殼 + 互動島」。
- **取捨/風險**：Nuxt islands 在 **SSG（`nitro: static`）下支援與成熟度有限**，且本站互動已天然隔離（搜尋頁 lazy、主題鈕單點），island 化的邊際收益不如直接用 D 的 `noScripts` 來得直接。**投入產出比不佳，不建議現階段投入。**

### 方案 F（最激進，留在 Nuxt 內）：lazy / delayed hydration
- **做法**：Nuxt 的 `<LazyHydrate>` / hydrate-on-visible 等，延後非首屏元件 hydration。
- **效益**：分散 hydration CPU。
- **取捨/風險**：本站頁面都很短，hydration 成本主要在 framework runtime 本身而非元件數量，delayed hydration 省不到固定稅。**收益小，不建議。**

---

## 5. 更激進：離開 Nuxt？（務實結論，不細究實作）

| 選項 | 能去掉什麼 | 要重寫什麼 | 值不值 |
|---|---|---|---|
| **Astro（islands）** | 預設零 JS，framework runtime 不進 client；Vue 元件可當 island 重用 | 重建 routing/layout/SEO/discovery pipeline；搜尋頁 Vue 元件包成 island | **長期最契合「靜態 + 島」的模型**，但要重寫殼層與 build pipeline（discovery、image、search-index 都得重接）。短期成本高 |
| **Eleventy / 11ty** | 幾乎全部 JS runtime | 全站重寫成 template（Vue 元件不能直接用）；搜尋要另接 | 內容站很適合，但 Vue 資產全棄、團隊心智重來。除非決心「徹底靜態」，否則不划算 |
| **純 Vite + 手刻 SSG** | 自己控制每一 byte | 自造 router/prerender/payload/SEO，全部自己維護 | 自由度最高、維護負擔也最高。不建議 |

**結論：換 stack 的收益（去掉 framework runtime）用方案 D 的 `noScripts` 在 Nuxt 內就能拿到八成，而換 stack 要付出重寫殼層 + discovery/image/search pipeline 的高成本。** 短中期應「在 Nuxt 上走到 D」，把換 Astro 當成「如果 D 之後仍嫌包袱重」的長期 escape hatch，現在不投入。

---

## 6. 與 028 的關係：互補，且應升格為「第一階段」

**028 與「去 hydration / 更靜態」是互補，不衝突。** 兩者打的是不同層：

- **028 = 資料層瘦身**：把每頁 `_payload.json` 從「內嵌全 catalog」改成「列表共用瘦 content.json + per-id detail」，解決 O(N) 膨脹。這是 hydration **餵進去的資料** 變小。
- **更靜態 = runtime 層瘦身**：減少 / 移除 hydration 本身與 framework runtime。這是處理 **吃資料的那台引擎**。

兩者疊加才完整：028 讓詳情頁不再背全站資料，而方案 D 進一步讓詳情頁連 hydration 引擎都不背——**028 是 D 的前置條件**。因為只有先把 detail 拆成 per-id 靜態 JSON、讓 SSR HTML 本身就含完整內容，detail 頁才有資格被 `noScripts`（否則少了 client fetch，頁面會缺資料）。

**明確建議：**

1. **028 照原 spec 做完，不要併、不要改範圍。** 它風險低、是地基、且已是 D 的必要前置。中途把它擴大會拖慢交付。
2. **028 完成後立刻開 028.5「runtime 瘦身」sprint**，範圍建議：方案 A（關 prefetch，立即）+ 方案 D 在 links/guide-list 試點 + 評估 detail 頁 `noScripts`。
3. **028.5 之後再評估方案 B（精簡 Nuxt UI）** 作為獨立 sprint，因為它要動較多 template、屬重構，不該混進 payload sprint。
4. 把這份 research 的方向寫進 028 spec 的「後續方向」一段，讓 028 的定位從「孤立的 payload 修補」變成「靜態化路線圖的第 1 步」。

---

## 7. Open Questions（需使用者決策）

1. **是否願意放棄「SPA 式換頁體驗」（Vue Transition 動畫 + 不刷新換頁）以換取詳情/列表頁真・零 JS？** 這是方案 D 的分水嶺，也是整個「更靜態」方向最大的產品取捨。若不願放棄，後續只能停在方案 A/B（瘦身但仍 SPA）。
2. **首頁分類 filter 接受變成「連結到預產分類頁（換頁）」嗎？** 還是必須維持目前 client 即時 filter？這決定首頁能否去掉 client 重算邏輯（方案 C）。
3. **主題切換在 noScripts 頁要怎麼辦？** 接受這些頁不能切主題（只跟隨系統/cookie），還是要用 inline script 補回？
4. **Nuxt UI 精簡（方案 B）的優先序**：要排在 028.5 一起，還是獨立 sprint 後做？（牽涉樣式 SSOT，工不小）
5. **長期是否保留「換 Astro」作為選項？** 若使用者心中其實傾向徹底靜態，或許值得在 028.5 試點後直接評估 Astro PoC，而非在 Nuxt 內持續打磨。

---

## 附錄：關鍵事實校正（vs 018／現況）

- SQLite WASM（018 最大包袱）**已移除**，目前不存在。
- 內容已成長到 **87 商品 / 11 指南 / 2 連結**（018 baseline 為 62 商品），payload O(N) 比 018 當時更痛，028 更有必要。
- minisearch + search-index **已 lazy 化**（`client-search.ts` 動態 fetch），不污染非搜尋頁首屏——這點現況做得好，不需動。
- content-hmr plugin（`content-hmr.client.ts`）**dev-only**（`import.meta.hot` gate），不進 production bundle。
- zod **不進 client**，僅 build 端驗證。
- 028 尚未實作：目前 `PublicContentPayload` 仍含 `details_by_id`，`default.vue` / `use-catalog-shell-data.ts` 仍依賴它——與 028 spec 描述的「現況」一致。
