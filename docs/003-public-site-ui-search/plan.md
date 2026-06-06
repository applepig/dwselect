# Public Site UI + Search Plan

## 背景

Sprint 1 已完成 Git-backed content data layer：公開站改為 Nuxt SSG + Nuxt Content，商品資料以 `content/products/*.json` 作為 SSOT，首頁只顯示 `status = "published"` 的商品，並可由 GitHub Actions 產生 static artifact。

Sprint 2 的任務是在既有資料層上建立正式可用的公開站瀏覽與搜尋體驗。此 sprint 不重新設計 content schema，也不導入 inside editing、remote agent 或 price monitoring workflow。

## 已知上下文

- 目前首頁 `app/pages/index.vue` 是 Sprint 1 最小可用版本，只渲染 category sections 與商品卡片。
- `app/utils/published-products.ts` 已有 published-only filter、category grouping 與 card mapping，可作為 UI/Search helper 的起點。
- `docs/002-git-backed-content-roadmap/research.md` 已決定 Sprint 2 search 方向：Nuxt UI `UInputMenu` + MiniSearch + build-time index JSON + `Intl.Segmenter('zh-Hant')`，bigram 作為 fallback。
- `docs/001-revamp/spec.md` 中 Wishlist、Dark Mode、商品詳情 modal 等功能保留為歷史參考，不直接帶入本 sprint。

## 選定方案

採用「公開站 baseline + client-side search」：

1. 首頁維持單頁 public catalog，不新增商品詳情頁。
2. 將商品列表 UI 正式化：header、搜尋列、分類 tab/chip、排序控制、空狀態與商品卡片。
3. 搜尋 index 在 generate/build 階段由 content products 產生為 static JSON，client 端在使用者 focus 或輸入時 lazy load。
4. 搜尋欄用 Nuxt UI `UInputMenu` 呈現下拉建議；實際排名由 MiniSearch 處理，`UInputMenu` 關閉內建 filter。
5. 測試以 pure helper 和 build script 為主，必要時再補 Nuxt smoke 或 Playwright。

## 替代方案

### 方案 A：只做 UI，不做搜尋

優點是最快改善視覺，但 Sprint 2 roadmap 明確包含 Search，若跳過搜尋會留下主要價值缺口。

### 方案 B：Nuxt Content 內建搜尋

優點是整合度高，但目前商品是 data collection，搜尋體驗需要商品卡片欄位與 CJK tokenizer 控制；MiniSearch 的 build-time index 更直接。

### 方案 C：外部搜尋服務

例如 Algolia 或 Typesense。商品量預估 100–500 筆，外部服務會增加帳號、同步、成本與部署複雜度，不符合本 sprint 的最小正確範圍。

## 範圍切分

### 本 sprint 包含

- 正式化公開首頁 layout 與商品卡片。
- 分類瀏覽與 category filter。
- 關鍵字搜尋：name、description、category、tags。
- 搜尋建議下拉：顯示商品名稱、分類、價格。
- 排序：預設、最新上架、名稱、分類。
- 搜尋空狀態與無商品狀態。
- RWD：手機、平板、桌面都可掃描與操作。
- 測試：搜尋 tokenizer、index 產生、filter/sort helper、runtime static generate。

### 本 sprint 不包含

- Wishlist / favorite。
- Dark Mode。
- 商品詳情頁或 modal。
- View Transition。
- 價格數字解析與價格排序。
- inside editing UI。
- Discord / opencode remote workflow。
- production deploy/domain 設定。

## 主要風險

- Nuxt UI 需要新增 dependency 與 module 設定；必須在 ADR 記錄原因並確認 `pnpm generate` 通過。
- MiniSearch index 若放進初始 bundle 會增加首頁成本；必須 lazy load static index。
- CJK tokenizer 對不同瀏覽器的分詞品質可能不同；fallback bigram 必須可測試。
- 搜尋結果與 category filter、sort 同時作用時容易產生狀態組合 bug；helper 需用 pure test 覆蓋。

## 建議執行順序

1. 建立 search document mapping、tokenizer 與 filter/sort helper tests。
2. 實作 build-time search index generator，輸出 static JSON。
3. 實作 client search composable 與 Nuxt UI search control。
4. 正式化首頁 layout、category filter、sort control、商品卡片與空狀態。
5. 跑 `pnpm test`、`pnpm generate`、runtime Sheet scan，必要時用瀏覽器檢查 RWD。
