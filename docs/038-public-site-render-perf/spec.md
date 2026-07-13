# 公開站 iPad/Safari 渲染與首屏效能修復

> 脈絡來源：本專案無 `docs/PRD.md` / `docs/TECHSTACK.md`；project-truth 依 `CLAUDE.md`（SSG + Nuxt Content + static payload、runtime 不依賴外部 fetch、Styling SSOT 走 `catalog.css` 的 `--dw-*` token）。

## 目標

修復三個由 iPad Safari 實測回報的公開站前端缺陷：

1. **Disqus 留言介面顯示簡體中文** — 應固定為正體中文（`zh_TW`）。
2. **iPad Safari 版面高度錯誤** — 頁面偶發只佔上半、底部露出大片背景色，底部導覽列（`.compact-app-bottom-tabs`）落在內容底而非 viewport 底。
3. **首屏渲染體感慢** — SSR HTML 已含完整卡片內容（已驗證，非 client-render 空殼），但進站後卡片骨架先排好、圖片與內容數秒後才「畫」出來。

## 非目標

- **不重寫 payload 架構**：028 的 per-id detail 拆分 + `prefetchOn: { interaction: true, visibility: false }` 已完成並上線，資料層冗餘與 prefetch 冗餘不在本 sprint 重做。
- **不換技術棧**：不為效能移除 Nuxt UI 或改 Astro（roadmap 已定調為長期 escape hatch，非優先）。
- **不擴大 view-transition 重構**：若診斷指認 VT 為效能主因，深度修法（大規模削減 `view-transition-name`、關閉 VT）獨立評估，見 ADR-3。
- **不改 Disqus 後台設定**（使用者已裁決走程式碼強制 `zh_TW`，設定進版控）。
- 不處理 `cf-cache-status: DYNAMIC`（首頁 HTML 每次回源）之外的 CDN／header 調校，除非 M3a 診斷指認其為首屏主因。

## User Story 1 — Disqus 正體中文

作為公開站的訪客，我在商品／指南詳情頁看留言區時，希望介面是正體中文，以便閱讀不被簡體干擾。

### 驗收條件

- [x] `disqus-thread.vue` 產生的 `disqus_config` 執行後，config context 帶有 `language === 'zh_TW'`。
  - 範例：`disqus_config.call(ctx)` 後 → `ctx.language === 'zh_TW'` 且 `ctx.page === { url, identifier }`（既有欄位不變）。
- [x] `DisqusConfig` / config context 型別包含 `language` 欄位（型別層不再需要 `@ts-expect-error` 或 `any` 才能設定 language）。
- [x] shortname 缺席（dev／preview）時行為不變：不 render 留言區、不注入 script（既有 AC15 不回歸）。

## User Story 2 — iPad Safari 版面高度正確

作為 iPad Safari 使用者，我瀏覽列表／詳情頁時，希望內容區填滿可視高度、底部導覽列貼齊螢幕底部，不要出現半截頁面加大片黑底。

### 驗收條件

- [ ] 在觸發 `.compact-app-bottom-tabs`（fixed 底部導覽）的視窗寬度區間，頁面靜止時：內容區高度填滿 viewport、底部導覽列貼齊 viewport 底、下方不露出 body 背景色。
  - 驗收方式：**iPad Safari 實機 + E2E 截圖**（此為視覺/佈局缺陷，無法以 unit 斷言像素；AC 以可觀測佈局狀態描述，實機重現通過為準）。
- [ ] 換頁動畫（VT 或退化 fade）結束後，底部導覽列回到 viewport 底、不殘留錯位。
  - 驗收方式：實機操作換頁後觀察 + E2E。
- [ ] 修復不破壞既有桌面 `.compact-app-rail` / `.compact-app-sidebar` 佈局與其他斷點（回歸檢查）。

> 根因待 M2 實機定位（`min-height: 100dvh` 在 iPad Safari 量測 vs fixed 元素 containing-block 副作用），定位後選最小修法；AC 描述目標佈局狀態，不預先綁定實作。

## User Story 3 — 首屏渲染體感改善

作為行動裝置訪客，我進入列表頁時，希望首屏內容（尤其可視區的商品圖）盡快呈現，不要盯著空骨架等數秒。

### 驗收條件（M3a 診斷）

- [x] 產出 Performance trace 定位報告，量化首屏主要耗時的歸屬占比：script/hydration、rendering/compositing（含 view-transition 快照）、image 下載/解碼三者。
  - 驗收方式：報告寫入 `works.md`，指認主因，作為 M3b/M3c 範圍依據（人工驗收）。

### 驗收條件（M3b 低風險確定修復——圖片）

- [x] 列表卡片 `<NuxtImg>` 提供響應式尺寸屬性（`sizes` + `width`/`height` 或 `densities`/`quality`），使實際下載的縮圖尺寸對應顯示尺寸，而非近全尺寸原圖。
  - 範例：渲染出的 `srcset` 含多個依 `sizes` 換算的寬度候選（非目前單一路徑 `1x, 2x`）。
- [x] 首屏可視區的前若干張卡片圖 `loading="eager"`（其餘維持 `lazy`），LCP 候選圖不因 `lazy` 延後；具體張數依 M3a grid 首屏可視數決定。
  - 範例：首屏 N 張 → render 出的前 N 個 `<img>` 無 `loading="lazy"`（或帶 `fetchpriority="high"`），第 N+1 起 `lazy`。
- [x] 圖片破圖 fallback（`useBrokenImageFallback`）行為不回歸。
- [x] （擴充，2026-07-12 使用者追加）詳情頁 hero 圖（product／guide 的 `detail-hero-image`）同樣提供響應式尺寸屬性，實際下載尺寸對應 `.detail-hero-layout` 各斷點的顯示尺寸；guide 外部圖（非 IPX 路徑）與破圖 fallback 行為不回歸。

### 驗收條件（M3c 條件性——依 M3a 結果）

- [ ] 若 M3a 指認 script/hydration 或 VT compositing 為首屏主因：提出修法提案（如卡片 lazy hydration、削減每卡 `view-transition-name` 數量、`UCard` 精簡）與其風險/範圍評估，於 review gate 由使用者裁決納入本 sprint 或延後為 038.x／併入 028.5 roadmap。
  - 驗收方式：提案文件（人工裁決）。

## 相關檔案

- `app/components/disqus-thread.vue` — `createDisqusConfig()` 補 `this.language`；`DisqusConfig`/`DisqusPageConfig` 型別補 `language`。（US1）
- `tests/disqus-thread.test.ts` — 既有 config 斷言處補 `language === 'zh_TW'`。（US1）
- `app/layouts/default.vue` — `.compact-app-shell`（`min-height: 100dvh`）宿主。（US2）
- `app/assets/styles/catalog.css` — `.compact-app-shell` line 6 `100dvh`、`.compact-app-bottom-tabs` line 1215 `position: fixed`、換頁 transition `will-change`（line 1043 附近）、其他 `100dvh`（606/1409/1484）。（US2）
- `app/components/app-navigation.vue` — bottom-tabs 結構。（US2）
- `app/components/product-card.vue` — 列表卡 `<NuxtImg>`（缺 `sizes`/`width`/`quality`）。（US3-M3b）
- `app/pages/index.vue` — 首屏 `v-for ProductCard`（決定首屏 eager 張數）。（US3）
- `nuxt.config.ts` — `@nuxt/image` 設定（line 193）；`experimental.viewTransition`（line 108）；如需 image `screens`/`densities` 預設。（US3）

## 既有資產盤點 / Reuse Map

| 既有資產 | 位置 | 本次如何沿用 |
|---|---|---|
| Disqus config pattern（`disqus_config.call` 測試） | `tests/disqus-thread.test.ts:149`、`app/components/disqus-thread.vue:72` | 沿用既有 config 機制，僅擴充 `language` 欄位與一條斷言，不新建結構 |
| `getDisqusShortname` / build-time define | `app/utils/disqus-settings.ts` | 不改；language 與 shortname 無關，直接在 config 補 |
| `@nuxt/image` + `<NuxtImg>` | `nuxt.config.ts:73,193`、`app/components/product-card.vue:23` | 已在用，只補響應式屬性（`sizes`/`width`/`quality`），不改 image module 之外的架構 |
| `useBrokenImageFallback` | `product-card.vue:82`、`app/utils/*` | 圖片屬性調整後保持 fallback 契約不變 |
| `--dw-*` token / `catalog.css` BEM class | `app/assets/styles/catalog.css` | iPad 高度修法走既有 class 與 token，不新增平行樣式來源（遵 Styling SSOT） |
| `.compact-app-bottom-tabs` / `.compact-app-rail` 斷點體系 | `catalog.css:1215,1317–1490` | 在既有 media query 結構內修，不新開斷點 |
| view-transition helper | `app/utils/product-view-transition.ts` | M3c 若削減 VT name 才動；M3a/M3b 不碰 |

新建項目：無新元件／util。M3a 的 Performance trace 為一次性診斷產出（寫入 works.md），非程式資產。

## 邊界案例

- **Case 1（US1）**：shortname 為空字串（dev/preview）→ 不 render 留言區、config 不執行，language 修改不產生任何第三方請求（AC15 不回歸）。
- **Case 2（US1）**：連續切詳情頁（A→B）時 config 換手 → language 仍為 `zh_TW`（既有 owner/token 換手邏輯不受 language 影響）。
- **Case 3（US2）**：iPad Safari 分割視窗／Slide Over 造成的窄寬度（744–767px 區間，落在 bottom-tabs 而非 rail）→ 高度修法在此寬度同樣正確。
- **Case 4（US2）**：旋轉、bfcache 還原、換頁動畫結束後 → 高度/底部導覽不殘留錯位。
- **Case 5（US3）**：首屏卡片數少於「eager 張數」的頁面（如過濾後只剩 1–2 張）→ eager 邏輯不越界、不報錯。
- **Case 6（US3）**：破圖商品 → eager/sizes 調整後 fallback icon 仍正確顯示。

## ADR

### ADR-1：Disqus 語言走程式碼 `this.language='zh_TW'`，不改後台
- 決策：在 `disqus_config` 內設 `this.language = 'zh_TW'`，型別補 `language` 欄位。
- 原因：設定進版控、單一真相、不依賴後台狀態；覆蓋 Disqus 自動偵測/後台預設。
- 替代方案：改 disqus.com 後台 Language（不進 repo、換 shortname 即失聯，使用者已否決）。

### ADR-2：效能先診斷定位，再修；圖片為低風險確定修復先做
- 決策：M3 拆為 M3a 診斷（trace 歸屬）→ M3b 圖片響應式尺寸 + 首屏 eager（低風險、已知確定收益）→ M3c 條件性深度修法。
- 原因：SSR 已含內容，「繪圖慢」的根因（hydration / VT compositing / 圖片解碼）未經 trace 不能斷定；把未證實根因寫成 AC 會誘導錯誤修法。圖片缺 `sizes`/`width` 是已證實的獨立缺陷，不論主因為何都值得修。
- 替代方案：直接假設「Nuxt UI 慢」並精簡/移除 UCard（未經量測、CatalogPill 已證實非 Nuxt UI，風險高，不採）。

### ADR-3：view-transition 深度修法（若成主因）不在本 sprint 硬解
- 決策：每卡 5 個 `view-transition-name` × 首頁近 400 個的 compositing 成本若被 M3a 指認為主因，M3c 只產出提案，實作延後 038.x 或併入 028.5 roadmap。
- 原因：VT 與 iOS Safari 已知問題（[[view-transition-ios-safari]]）、031 spike 待驗證交織；大規模削減 VT name 牽動換頁動畫體驗，屬獨立任務，避免在效能 sprint 內夾帶大重構。
- 替代方案：本 sprint 直接關 VT 或全面削 name（影響換頁手感、範圍失控，不採）。

## Milestones

> 三個 milestone 對應三個獨立缺陷，各自可獨立 commit（使用者授權後）。M1 最單純建議先行。

### Milestone 1: Disqus 正體中文
> 範圍：`app/components/disqus-thread.vue`、`tests/disqus-thread.test.ts`
> 驗證：`pnpm test tests/disqus-thread.test.ts`（config 帶 `language==='zh_TW'`、AC15 不回歸）；型別過 `pnpm typecheck`
> 預期結果：留言介面固定正體中文，型別乾淨

- [x] Red → Green → Refactor：config 補 `language`、型別補 `language` 欄位、測試斷言

### Milestone 2: iPad Safari 版面高度
> 範圍：`catalog.css`（`100dvh`／bottom-tabs／transition containing-block）、`default.vue`、`app-navigation.vue`；先實機重現定位根因
> 驗證：iPad Safari 實機重現→修復→複驗（高度填滿、底部導覽貼底、換頁後不錯位、桌面斷點不回歸）；E2E 截圖
> 預期結果：iPad 半截頁面/露黑消除，各斷點佈局正確

- [ ] 實機重現 + 定位（`dvh` 量測 vs fixed containing-block）→ 最小修法 → 實機複驗

### Milestone 3: 首屏渲染效能
> 範圍：M3a 診斷（Performance trace）；M3b `product-card.vue` NuxtImg 響應式尺寸 + `index.vue` 首屏 eager；M3c 條件提案
> 驗證：trace 報告寫入 works.md；`pnpm test`（圖片屬性 render 斷言、fallback 不回歸）；throttled 實機/Lighthouse 首屏體感複驗
> 預期結果：首屏圖尺寸對應顯示尺寸、可視區圖不 lazy 延後、根因歸屬明確

- [x] M3a：Performance trace 定位主因（hydration / VT compositing / image），寫入 works.md
- [x] M3b：Red → Green → Refactor：NuxtImg `sizes`/`width`/`quality` + 首屏 eager
- [ ] M3c：依 M3a 結果產出深度修法提案，review gate 裁決納入/延後
