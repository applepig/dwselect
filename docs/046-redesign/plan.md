# 046 DW嚴選 全站 Redesign — 前置規劃

> 狀態：五個方向決策已於 2026-09-07 拍板（見「決策」節）。下一步是 design canvas 出圖，定案後再寫 `spec.md`。本檔不是 spec。
> 脈絡：2026-06 的 `docs/design_handoff_dwselect_redesign/`（Direction C「俐落清單」）是目前版面的出處，
> 但之後 019～044 各 sprint 各自加頁、加元件，沒有回頭整合。使用者定調：**直接朝 redesign 想，不是修補 Direction C**。

## 為什麼現在做

使用者觀察到三個症狀，盤點後發現是同一個結構性缺口——「沒有可對齊的設計系統」：

1. **換頁慢** → 已由 045 獨立修掉（VT 快照 475 → 6），不在本 sprint。
2. **設計語言不一致**：token 只有顏色一族（`variables.css`），沒有 spacing／radius／type scale；`catalog.css` 有 7 種 radius、12 種字級、約 40 種間距字面值。價格沒有 formatter，`price_label` 是作者手打字串直印（`500`、`NT$6,498`、`TWD 54,214.38`、`￥840`、`約¥5000`、`249~349`、`大概16000`……），同一個價格在卡片／詳情上方／詳情「目前參考價」／搜尋結果有 4 種視覺；schema 裡的 structured price（`price: { amount, currency, unit, label }`，96 個 offer 有 89 個帶 amount，幣別 TWD 67／JPY 22／USD 4）沒有任何顯示程式碼在讀——公開站顯示的是 `price_text`（`scripts/public-payload/map-product-card-fields.ts:25`）。Pill 有 5 套（`CatalogPill` 兩變體、`.category-chip`、`.tag-chip`、`.channel-badge`、三種 count），詳情頁把分類／通路／品牌／標籤印成四排長得一樣的 pill，卡片上卻沒有分類、品牌、標籤。
3. **導航冗餘**：桌面首頁左上角「DW嚴選」出現三次（側欄 `.nav-brand`、kicker「DW SELECT」、H1 breadcrumb 根節點）；layout 把 breadcrumb 當 H1，商品／指南真正的標題被降成 H2；brand／tag 頁是完整預渲染頁卻只能從詳情頁 pill 進；category 在桌面（側欄）與平板以下（chip bar）用兩套互斥機制。

六月 handoff 其實已規定 radius scale、type scale 與價格格式（`NT$ ` + `toLocaleString`），是實作時沒落地。

## 現況資產（redesign 要吃進去的東西）

- **頁面**：`/`、`/category/[id]`、`/tag/[id]`、`/brand/[id]`、`/channel/[id]`（四個 taxonomy 頁共用 `taxonomy-page.vue`）、`/products/[id]`、`/guide`、`/guide/[id]`、`/links`、`/search`。共 10 個 route、7 種版型。
- **資料**：79 商品、11 指南、2 連結；商品有 `offers[]`（目前每筆恰一個 offer）、structured `price`、`short_description`（卡片一句話）、`long_description`、`llm_description`（詳情頁「AI 怎麼說」長文）、`reference_links[]`。
- **元件**：`product-card`、`product-detail`、`guide-detail`、`taxonomy-page`、`category-chip-bar`、`catalog-pill`、`app-navigation`（側欄／rail／底部 tab 三態）、`resource-list`、`link-panel`、`related-products-section`、`share-buttons`、`disqus-thread`、`theme-toggle`、`search/*`。
- **樣式約束（CLAUDE.md，不變）**：每個元素只挑一套樣式來源（Nuxt UI 預設外觀 或 `catalog.css` BEM-like class），顏色一律走 `--dw-*` token 支援 light/dark，共用視覺原子用既有元件。
- **技術約束（不變）**：Nuxt SSG、runtime 不依賴外部 fetch、內容 SSOT 在 `content/`。

## 目標（草案）

- 一套設計系統：color／spacing／radius／type 四族 token，元件只從 token 取值。
- 一個價格 formatter 讀 structured price，`約`、`起`、range、單位是 formatter 的 modifier，不是 prose；全站價格一種視覉語彙（卡片與詳情可差尺寸，不差形式）。
- 一個語意化 label 元件：category／brand／tag／channel／price 各有固定變體，看得出是哪一種；卡片與詳情露出的 taxonomy 一致。
- 導航一份：品牌名一處、真正的內容標題是 H1、brand／tag 頁可從瀏覽面到達、category 導航桌面與行動同一機制。
- 7 種版型在同一套 grid／spacing 下重排；頁數少，可以一次做完。

## 非目標（草案）

- 不改內容模型與 `content/` schema（formatter 讀既有 `price.amount／currency／unit／label`；`price_text` 降為作者原始記錄、不再顯示——見決策 3）。
- 不換技術棧（維持 Nuxt UI + `catalog.css` 的 SSOT 規則）。
- 不動 SEO route 結構（10 個 route 保留）。
- 不做 Direction C 以外的全新資訊架構——tab 數、頁面種類維持，重的是視覺與元件系統。

## 決策（2026-09-07，使用者已拍板）

1. **視覺方向：保留暖色橘 accent。** `--dw-*` token 與六月 handoff 的完整雙主題色表已落地，色彩重來會丟掉唯一已成形的一族 token，卻換不到本 sprint 真正要解的缺口（沒有 spacing／radius／type scale）。
2. **卡片只加分類，不加品牌／標籤。** 019 的既有決策是「減框、減 overlay」＋文字區固定三行以對齊價格／通路列，再塞三種 pill 與之相反。分類是導航主軸（側欄／chip bar 都以它為軸），值得露出；品牌／標籤留在詳情頁。
3. **不動 schema；`price_text` 退場，formatter 讀 structured price。** 原本以為要加欄位，實測發現 `price.label` 已存在。Formatter 契約：`amount` 有值 → 格式化金額，`label` 以次要註記呈現；`amount` 為 null → 直印 `label`。現有 19 筆 `label` 語意混了三種（無法 parse 時的原文複製、與金額並存的註記如 `折扣價`／`官方促銷價（原價 US$8,950）`、單一筆真正的修飾詞 `約`），此契約三種都吃得下且不需強制改內容。6 筆無 amount（`大概16000`、`低於60000`、`比較貴一點`、`一台4400`、`20~30鎂`、`249~349`）走 label 直印；其中兩筆 range 不加 `amount_max`（YAGNI），可日後選擇性補 amount。
4. **H1 歸位，直接做。** 查證後 SEO 沒有變動要接受——`<title>` 已是 `${product.name}｜DW嚴選`（見 `tests/product-detail-page-head.test.ts:119`），與 breadcrumb／H1 無關。
5. **先出圖，且只出一個方向。** 色彩既然沿用（決策 1），2～3 個方向會退化成同一套色的三種排法。用 design canvas 出一個方向的 phone＋desktop，使用者在畫布上直接改，定案後再寫 spec。

## 建議的 Milestones（出圖定案後進 spec）

- M1 設計系統：token 四族＋`catalog.css` 收斂＋price formatter＋語意化 label 元件（含測試：formatter 的 currency／modifier／range 行為）。
- M2 導航與 layout：品牌名單一處、H1 歸位、category 導航單一機制、brand／tag 入口。
- M3 七種版型重排：首頁／taxonomy 列表、商品詳情、指南列表／詳情、連結、搜尋。
- M4 開頁驗收：desktop／tablet／phone 三尺寸實看、light/dark、E2E 既有 spec 更新。

## 參考

- 現況截圖（2026-09-07 正式站）：首頁 desktop／mobile、詳情、指南，見本次 session 的量測；正式站 https://dwselect.applepig.net/
- `docs/design_handoff_dwselect_redesign/README.md`：Direction C 的 token／type scale／互動規格
- `docs/019-product-card-visual-density/`、`docs/020-product-detail-info-architecture/`、`docs/031-taxonomy-nav-single-source/`、`docs/035.1-compact-ui-visual-fixes/`：與本次重疊的歷史決策
