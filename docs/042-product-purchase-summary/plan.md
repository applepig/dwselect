# Product Purchase Summary Plan

## 背景

Product detail 目前在價格下方顯示的上方 CTA 僅在 tablet／desktop 可見，且位於「DW 怎麼說」之後；mobile 唯一主 CTA 則在長篇 AI 說明後。讀者若要購買，價格與行動距離過遠，且下方 CTA 缺少當下的價格與通路脈絡。

## 已確認方向

- Product detail 保留上下兩個 CTA，所有 viewport 都顯示上方主 CTA。
- 上下 CTA 使用相同的主行動文案與主色樣式「前往 {channel_label} 查看現價」。
- 上方 CTA 緊接價格；下方 CTA 放在 Product-only 購買摘要卡中，位於 AI 說明後、參考資料前。
- 摘要卡顯示「目前參考價」、`price_label`、`channel_label` 與主 CTA，不重複產品名稱或價格免責文字。
- Guide 的上下「看原文」CTA 與 `source_url` 行為不改。
- 不擴充 schema、payload、API 或搜尋；現有 `price_label`、`channel_label`、`buy_url`、`fine_print` 已足夠。

## 方案比較

### 方案 A：價格旁快速入口 + 下方購買摘要卡（選定）

- 上方 CTA 在價格後立即可行動；下方卡片在閱讀完 AI 資訊後重述價格與通路，再提供同一主 CTA。
- 優點：維持閱讀與購買兩種節奏，兩個行動文案與層級一致，mobile 與 desktop 一致，最少改動既有資料模型。
- 缺點：價格與 CTA 會重複一次，需用不同視覺層級清楚表達目的。

### 方案 B：只把現有主 CTA 移到價格後

- 優點：資訊重複最少。
- 缺點：使用者已選擇保留讀完說明後的下方轉換點，不能滿足上下各有 CTA 的需求。

### 方案 C：mobile sticky 購買列

- 優點：購買操作隨時可見。
- 缺點：與 mobile bottom navigation 競爭畫面與 safe area，需要 scroll／focus／accessibility 額外處理，超出目前需求。

## 實作邊界

- 修改 `app/components/product-detail.vue`、`app/assets/styles/catalog.css` 與相關 Product detail render／E2E tests。
- 新增 purchase summary 專用 class，不改寫共用 `.detail-buy-cta`，避免影響 Guide。
- 保留兩個 Product CTA 都指向相同的 `buy_url`，使用 `target="_blank"` 與 `rel="noopener noreferrer"`。
- 摘要卡以語意 section 標示購買資訊，支援長價格／長通路換行與鍵盤 focus。

## 風險與驗證

- CTA 重複：兩個 CTA 使用相同主行動文案，位置而非樣式區分使用時機。
- RWD：desktop 使用價格／CTA 的雙欄摘要；mobile 改為價格資訊在上、全寬 CTA 在下，不應產生水平溢出。
- Guide regression：測試鎖定 Guide CTA 文案與 `source_url` 不變。
- 實作後以正式 app URL 檢查 Product detail 的 mobile、tablet、desktop 畫面。
