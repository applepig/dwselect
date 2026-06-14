# Sprint 6 Research：價格、通路與分類資料契約

## Intl / Currency

### 結論

價格 schema 的 `currency` 應使用 ISO 4217 三碼貨幣代碼，例如 `TWD`、`JPY`、`USD`。

### 依據

- `Intl.NumberFormat` 的 `style: 'currency'` 要求提供 `currency` option。
- `currency` 的值是 ISO 4217 currency code，例如 `USD`、`EUR`、`CNY`，並會 normalize 成 uppercase。
- `Intl.supportedValuesOf('currency')` 可列出 runtime 支援的 canonical currency identifiers。
- ISO 4217 是通用貨幣代碼標準，定義 alphabetic code、numeric code 與 minor unit。

### 限制

`Intl.NumberFormat` 的 `style` 只能在 `currency`、`unit`、`decimal`、`percent` 等模式中擇一。它可以格式化貨幣，也可以格式化單位，但不能直接用單一 formatter 表達「每公斤價格」這種 `currency per unit` domain concept。

因此 schema 應分開儲存：

- `amount`：數字價格。
- `currency`：ISO 4217 code。
- `unit`：售價單位，例如 `each`、`kilogram`。
- `label`：非標準或覆蓋顯示文案。

UI 可優先使用 `label`；沒有 `label` 時用 `Intl.NumberFormat` 格式化 `amount + currency`，再依 `unit` 補上 `/kg` 或其他單位文案。

## Channel / Category

通路與分類都應抽成獨立 JSON 維護，而不是在 Product schema enum 中硬編所有 metadata。Product 只存穩定 id，UI 透過 definition JSON 取得名稱、排序、顏色、icon 與 host mapping。

第一波 channel definition：

- `pchome`
- `momo`
- `amazonjp`
- `amazonus`
- `costco`
- `other`

不在第一波清單中的通路，migration 先寫成 `other`。

分類也採 definition JSON。若出現新分類，先加 definition，再讓商品引用該 id。

## Links

連結 tab 不只是外連清單，而是一個站內 panel / page，用類似商品 grid 的卡片方式介紹相關連結。資料也應可獨立維護，避免寫死在 component 內。
