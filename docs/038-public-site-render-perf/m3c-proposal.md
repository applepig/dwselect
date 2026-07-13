# M3c 深度修法提案：首屏 script／hydration 成本削減

> **提案待使用者裁決，未實作。** 本文件為 spec US3 M3c 驗收產物（「提案文件（人工裁決）」），依 ADR-2 條件觸發：M3a 已指認 script／hydration 為首屏共同主因。每項提案含作法、預期收益、風險、驗證方式與納入建議，於 review gate 由使用者裁決納入本 sprint 或延後 038.x。

## 依據（M3a 診斷關鍵事實）

- 4x CPU throttle（iPad 近似）下 long task **總計 3.2s**，最大單一 **993ms**＝Vue hydration 一口氣 hydrate 首頁 77 張卡（桌機未 throttle 時為 496ms microtask）。
- script eval 最大宗是**第三方分析**（桌機未 throttle）：GTM/GA4 經 Cloudflare Google tag gateway first-party 路徑 `/w6q7/*` ≈ **350ms**＋Cloudflare Web Analytics `beacon.min.js` ≈ **53ms**；Nuxt entry chunk 本體 eval 僅 ~9ms。
- paint／composite 僅 53ms，**VT compositing 已排除為首屏主因**——每卡 5 個 `view-transition-name` 只在換頁快照時付費。
- SSR HTML 含完整卡片內容（166KB），FCP <1s 即繪出；體感慢＝首繪後 main thread 被 hydration＋三方 script＋圖片解碼堵住。

## 現況佐證：第三方分析的三條注入路徑（2026-07-12 production HTML 實查）

以 curl 對 `https://dwselect.applepig.net/` 做三組對照（預設 UA、僅換 iPad Safari UA、完整瀏覽器 header 含 `Sec-Fetch-*`／`Accept`／`Accept-Language`），確認注入方式——**Cloudflare 的 zone 層注入依請求 header 綜合判斷是否為真瀏覽器，僅換 UA 不足以觸發（前兩組皆無注入、第三組才出現）**，故單看 repo 原始碼或 bot 視角 HTML 會漏掉兩條路徑：

| # | 路徑 | 注入層 | 載入屬性 | 可控性 |
|---|---|---|---|---|
| 1 | repo 內 GTM snippet（`nuxt.config.ts` line 56–61 定義、line 80–92 經 `app.head.script` 注入，inline，load `https://www.googletagmanager.com/gtm.js?id=GTM-KTZKC8CH`） | **snippet 注入（進版控）** | inline 立即執行、gtm.js `async` | **程式碼完全可控** |
| 2 | Cloudflare **Google tag gateway** 注入的 first-party loader：`window['google_tags_first_party'].push('GTM-KTZKC8CH')`＋第二段 GTM loader `j.src='/w6q7/'`，注入在 `<head>` 最前端（早於 `<meta charset>`） | **zone 層注入（Cloudflare edge，不在 repo）** | inline 立即執行、`/w6q7/` `async` | **僅 Cloudflare dashboard 可控**；程式碼延後 snippet #1 無法影響它 |
| 3 | Cloudflare **Web Analytics** `beacon.min.js`（`static.cloudflareinsights.com`，`data-cf-beacon` token） | **zone 層注入（自動注入）** | `defer` | 僅 Cloudflare dashboard 可控 |

**衍生新發現——同一 container 重複載入**：路徑 1 與路徑 2 各自載入同一個 `GTM-KTZKC8CH` container（一份走 `googletagmanager.com`、一份走 first-party `/w6q7/`）。gtm.js 內部會 dedupe 執行，但兩份的下載＋parse 成本仍然雙付；M3a trace 中 eval 大宗（≈350ms）落在 `/w6q7/*`，亦即**目前 script 成本的主要來源是 zone 注入那條，不是 repo snippet 那條**。這直接決定了提案 1 各方案的收益上限。

---

## 提案 1：第三方分析延後載入

### 作法

因可控性分屬兩層，拆成三個子項分開裁決：

- **1a（程式碼，repo 內）**：把 GTM snippet 從 `app.head.script` 的同步 inline 移為延後載入——移除 head 內 inline script，新增 client plugin，在 `requestIdleCallback`（帶 timeout fallback，如 3–5s）**或**首次使用者互動（`pointerdown`／`keydown`／`scroll`，`once`）二者先到者觸發時，才注入同一段 snippet。`noscript` iframe 維持不動。實作約 20–30 行，不需引入 Nuxt Scripts module（單一 script、單一 trigger，加依賴屬 YAGNI；若日後三方 script 增多再評估改用 `@nuxt/scripts` 的 trigger 機制）。
- **1b（Cloudflare dashboard，非程式碼）**：處置 Google tag gateway 的 zone 層自動注入。**不關掉它，1a 的收益極有限**（`/w6q7/` loader 照樣在 `<head>` 最前端立即執行，350ms 照付；1a 只省掉重複載入的那一份）。選項：
  - 關閉 gateway 的「自動注入」、保留 gateway 路由能力，container 載入權回到 repo snippet（可評估把 snippet 的 `j.src` 改指 `/w6q7/` 以保留 first-party 路徑的優點；需先確認關自動注入後該路由是否仍有效，且 dev／toybox 環境無 gateway 需 env 條件分流）。
  - 或整個停用 gateway，snippet 維持 `googletagmanager.com` 直載（放棄 first-party 路徑的 adblock 耐受與 first-party cookie 特性）。
- **1c（Cloudflare dashboard，非程式碼）**：Web Analytics `beacon.min.js` 已是 `defer` 且僅 ≈53ms，成本小；可維持現狀，或在 dashboard 關自動注入改手動 snippet（收益低，不主動建議動）。

### 預期收益

- 1a＋1b 合併：首屏關鍵期還 main thread ≈400ms（桌機未 throttle 量測）；4x throttle 下依 M3a 倍率推估可還 **1s 上下**的 long task 時間，直接壓縮「FCP 後 main thread 斷續堵到 ~4.3s」的區間。另消除重複 container 下載（≥數十 KB 網路＋一次 parse）。
- 只做 1a（不動 dashboard）：僅省重複載入那一份，`/w6q7/` 350ms 主成本不動——**收益有限，須明示**。

### 風險

- **分析資料折損**：延後到 idle/interaction 意味極短停留（載入即離開）的訪次可能不被記錄；pageview 時間戳後移。對內容站的流量觀測屬可接受偏差，但需使用者確認分析用途容忍度。
- **GTM container 內若掛有非分析類 tag**（如 consent、remarketing pixel），一併被延後；裁決前建議使用者確認 container 內容。
- 1b 涉及 Cloudflare 帳戶設定，**設定不進版控**、變更無 PR 軌跡——需在 works.md 記錄操作內容與日期以補文件軌跡。
- dev／preview 環境（`toybox.local`）無 gateway，若 snippet 改指 `/w6q7/` 需條件分流，增加環境差異面。

### 驗證方式

- 重跑 M3a 同條件 4x throttle trace（同 `throttled-run.mjs` 方法），比對 long task 總量與最大單一 task；預期 `/w6q7/*`／gtm eval 移出 FCP–LCP 關鍵期。
- 以瀏覽器 UA 抓 production HTML，佐證 zone 注入變化（1b 生效與否）。
- GA4 即時報表確認延後載入後事件仍正常進站；`pnpm test` 既有測試不回歸。

### 納入建議

- **1a：建議納入本 sprint**——改動小、完全在 repo 內、可測。
- **1b：建議同步處理但獨立於程式碼 PR**——屬 Cloudflare dashboard 操作，需使用者親自執行或授權；沒有 1b，1a 收益有限，兩者宜綁定裁決。
- **1c：建議維持現狀**（defer＋53ms，處理優先級低）。

---

## 提案 2：卡片 lazy hydration（削減首屏 hydration 範圍）

### 作法

使用 Nuxt 4 內建 delayed hydration：列表頁（`app/pages/index.vue` 及 taxonomy 列表使用處）把 `<ProductCard>` 改為 `<LazyProductCard hydrate-on-visible>`（Vue 3.5 `hydrateOnVisible` 策略，Nuxt 3.16 起穩定內建、4.x 預設可用；動工前以最小 PoC 確認本版本行為）。SSR 輸出不變，client 端改為各卡進入 viewport 才 hydrate：首屏可視卡（2 欄 × 3 列 ≈ 6 張）幾乎立即 hydrate，fold 下的 ~70 張隨捲動分批 hydrate——**77 卡一口氣 993ms 的單一 long task 被拆成多個小 task 且大半後移**。

不採 `hydrate-on-idle`（idle 時仍一口氣全 hydrate，只是延後、不拆分）；不採手動拆 v-for 分批 render（重造輪子，Nuxt 已有內建 API）。

### 前提與風險評估（77 卡 SSR 內容已完整的前提下）

- **SSR 內容完整已由 M3a 驗證**（166KB HTML 含全部卡片，FCP <1s），lazy hydration 不影響首繪與 SEO——這是本作法成立的前提，且已成立。
- **hydration 前的互動退化**：卡片主互動是 `<NuxtLink>`，SSR 渲染為原生 `<a href>`，未 hydrate 時點擊走原生整頁導航（可用、但無 SPA 換頁與 VT 動畫）。可視卡進 viewport 即 hydrate，實際暴露窗口極短；fold 下卡片捲到才可能被點，屆時已 hydrate。風險低。
- **破圖 fallback 契約**：`@error` listener 在 hydrate 前不掛，但 `product-card.vue` 已有 `onMounted` 的 `scanForBrokenImage` 補掃（line 100–103，原為處理 SSR／快取即失敗的圖）——延後 mount 時同樣執行，`useBrokenImageFallback` 行為不回歸（Case 6），但需以既有 fallback 測試＋一條 lazy hydration 情境驗證。
- **VT inline style 不依賴 hydration**：`getProductViewTransitionStyle` 產出的 `view-transition-name` 是 SSR inline style，未 hydrate 的卡片換頁快照仍持有 name；未 hydrate 時點卡走原生導航本就無 VT，與現況一致。
- **其他**：`Lazy` 前綴使 ProductCard 成為 async component，多一個 chunk request（同元件單一 chunk，HTTP/2 下可忽略）；每卡一個 IntersectionObserver 觀測（首頁 ~77 個，成本可忽略）；props 同源自 payload，hydration mismatch 風險低，驗證時盯 console warning。

### 預期收益

4x throttle 下最大 993ms long task 預期縮至首屏可視卡規模（6–10 卡，粗估 <150ms），TBT 與 INP 顯著改善；與提案 1 疊加後，FCP 後 main thread 堵塞區間（~4.3s）預期大幅縮短。

### 驗證方式

- 重跑 4x throttle trace：比對 long task 分布（最大單一 task、總量）與 hydration task 拆分情形。
- `pnpm test`：卡片互動、破圖 fallback、eager/sizes 屬性斷言不回歸；console 無 hydration mismatch warning。
- `pnpm test:e2e`＋實機 iPad Safari：捲動後卡片互動（點卡進詳情、channel pill 導航）正常、體感複驗。
- 遵 Frontend Handoff：實際打開頁面確認捲動 hydration 無可見閃爍或版面跳動。

### 納入建議

**建議納入本 sprint**：改動面小（列表頁使用處改 `LazyProductCard`＋策略屬性，元件本身不動）、直接命中 M3a 指認的最大單一 long task、風險點皆有既有機制或測試覆蓋。若要更保守，可先只上首頁、taxonomy 列表延 038.x，但兩處用法一致，分開做的邊際風險差異不大。

---

## 提案 3：VT `view-transition-name` 削減（明確標註：非首屏主因）

### 定位

M3a 已排除 VT compositing 為首屏主因（首載 paint/composite 僅 53ms；每卡 5 個 name × 77 卡 ≈ 385 個，只在**換頁快照**時付費）。本項屬**換頁體感議題**，不在 US3「首屏渲染體感」範圍內，列此僅為完整性與 ADR-3 對齊。

### 作法（概述，供延後排程參考）

- 削減每卡 name 數：5 個（card/image/title/summary/price）收斂為 1–2 個（image 為主），換頁動畫語彙同步簡化；或
- 改為「點擊時才掛 name」：平時卡片無 `view-transition-name`，pointerdown 時只給被點的那張卡動態設上，快照成本從 385 個 name 降為 ~5 個。

### 預期收益／風險／驗證

- 收益：換頁快照建立成本下降、iOS Safari VT 風險面縮小（與 [[view-transition-ios-safari]] 已知問題、031 spike 交織）；**對首屏無收益**。
- 風險：換頁動畫語彙改變需使用者驗收；「點擊時掛 name」與 Vue transition／VT 換手時序有交互細節，屬獨立設計題。
- 驗證：換頁情境 trace（快照階段耗時）＋實機換頁體感驗收。

### 納入建議

**建議延後**，併入 028.5（noScripts＋cross-document VT PoC）或另立 038.x——與 ADR-3 決策一致：VT 深度修法不在效能 sprint 內夾帶。

---

## 裁決摘要

| 項目 | 建議 | 收益（4x throttle 推估） | 風險 | 依賴 |
|---|---|---|---|---|
| 1a GTM snippet 延後（程式碼） | 納入本 sprint | 與 1b 合併 ≈1s；單做則有限 | 低（分析折損容忍度需確認） | 1b 綁定裁決 |
| 1b Gateway zone 注入處置（dashboard） | 同步處理（使用者操作） | 同上，為主要收益來源 | 中（設定不進版控、需補記錄） | 使用者 Cloudflare 權限 |
| 1c beacon.min.js | 維持現狀 | ~53ms（defer） | — | — |
| 2 卡片 lazy hydration | 納入本 sprint | 993ms long task → 首屏卡規模 | 中低（fallback／互動退化皆有覆蓋） | 無 |
| 3 VT name 削減 | 延後 038.x／併 028.5 | 首屏 0；換頁體感另計 | 中（動畫語彙變更） | 028.5 roadmap |

**待使用者裁決點**：
1. 1a＋1b 是否綁定執行？GTM container 內是否有分析以外的 tag（影響延後容忍度）？
2. 1b 選「關自動注入保留 gateway 路由」還是「整個停用 gateway」？
3. 提案 2 範圍：首頁＋taxonomy 列表一次上，或先首頁？
4. 提案 3 是否確認延後（維持 ADR-3）？
