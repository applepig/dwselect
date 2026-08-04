# Product Purchase Summary

## 目標

讓 Product detail 的價格與購買入口保持接近，同時在讀完 AI 說明後提供包含價格與通路脈絡的下方購買摘要卡。

## 非目標

- 不修改 Product schema、detail payload、API、offer 選擇規則或搜尋 index。
- 不顯示 offer 查價時間或新增「最低價」語意。
- 不重複顯示產品名稱。
- 不改變 Guide 的上下「看原文」CTA 或 `source_url` 行為。
- 不新增 mobile sticky CTA。

## User Story

作為正在閱讀 Product detail 的訪客，我想在價格旁快速前往通路，並在讀完 AI 資訊後看到帶有價格與通路的購買摘要，以便不必在長篇內容中尋找購買入口。

### 驗收條件

- [x] Product 的上方主 CTA 位於 `price_label` 後，所有 viewport 顯示，文案為「前往 {channel_label} 查看現價」，使用 primary `buy_url`、`target="_blank"` 與 `rel="noopener noreferrer"`。
- [x] Product 的下方主 CTA 改為 purchase summary，放在 AI 說明後、參考資料前；不再有獨立且缺乏價格脈絡的下方 CTA。
- [x] purchase summary 顯示「目前參考價」、既有 `price_label`、既有 `channel_label` 與 primary CTA；不顯示 `detail.name` 或 `fine_print`。
- [x] purchase summary 的主 CTA 與上方 CTA 使用相同文案「前往 {channel_label} 查看現價」，維持 primary `buy_url`、安全外連屬性與清楚 keyboard focus。
- [x] Desktop 的 purchase summary 價格資訊與 CTA 可並排；mobile 垂直排列且 CTA 可用全寬，沒有水平溢出。
- [x] Guide detail 的上／下「看原文」CTA 與 `source_url` 不變。
- [x] Product render tests、Guide regression test、相關 E2E CTA 契約與實際 Product detail 的 mobile／tablet／desktop 畫面驗收通過。

## 相關檔案

- `app/components/product-detail.vue` — Product 上下 CTA 與 purchase summary markup。
- `app/assets/styles/catalog.css` — Product purchase summary 的 responsive、focus 與長文字樣式。
- `app/components/guide-detail.vue` — 僅作 CTA regression 對照，不改 production behavior。
- `tests/product-detail-back-navigation.test.ts` — Product CTA 順序、資料與安全外連行為。
- `tests/guide-detail-render.test.ts` — Guide CTA 不變的 regression。
- `tests/e2e/compact-app.spec.ts` — Product detail CTA 契約與 RWD 驗收。

## 介面／資料結構

不新增或改變 API。Product detail 使用既有欄位：

```ts
type ProductDetailView = {
  price_label: string
  channel_label: string
  buy_url: string
}
```

Purchase summary 顯示文案：

```text
目前參考價
{price_label} · {channel_label}
[前往 {channel_label} 查看現價]
```

## 邊界案例

- Case 1：`price_label` 或 `channel_label` 很長。處理方式：purchase summary 的文字容器必須可換行且沒有水平溢出。
- Case 2：Product 沒有 AI 說明。處理方式：purchase summary 仍在 detail 內容區、參考資料前顯示，CTA 不依賴 AI 區塊存在。
- Case 3：Guide 沒有價格或通路。處理方式：不套用 purchase summary，維持既有「看原文」CTA。

## ADR

### ADR-1：保留兩段 CTA，使用同一主行動表達

- 決策：上方是價格後的主 CTA，下方是含價格／通路脈絡的購買摘要卡，兩者使用同一文案與主色 CTA。
- 原因：訪客在掃讀價格與完成長篇閱讀後都有自然的行動點；同一主行動避免上方看似輔助連結、下方才像實際購買動作的層級混淆。
- 替代方案：只保留一個 CTA。排除原因是無法同時滿足快速行動與閱讀後轉換的使用情境。

### ADR-2：不在摘要卡重複產品名稱

- 決策：摘要卡僅顯示價格、通路、免責與 CTA。
- 原因：產品名稱已在 detail 頂端；重複名稱會使摘要卡看似第二張商品卡，增加視覺雜訊。
- 替代方案：加入淡色產品名稱作為 context。排除原因是目前資訊不足以證明讀者會失去頁面脈絡。

## Milestones

### Milestone 1：Product purchase summary 與 CTA 位置

> 預期結果：Product detail 的上下 CTA 與價格資訊有清楚的兩段式層級，Guide 行為不變。
> 驗證方式：Product／Guide render tests、E2E CTA 契約、實際 Product detail mobile／tablet／desktop 驗收。

- [x] 撰寫／更新測試（Red）：上下 CTA 相同文案、上方 CTA 順序與安全屬性、下方 summary 資訊／位置／無產品名稱與免責、Guide CTA regression。
- [x] 實作最小功能（Green）：Product markup 與專用 responsive／focus CSS；更新 E2E CTA selector／契約。
- [x] Refactor：確認 Guide 不共用 Product-only summary class，並維持現有資料 payload 不變。
