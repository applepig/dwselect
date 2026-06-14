# Content 檔案關係

## Content source

本站公開內容的 SSOT 是 Git-backed `content/` 檔案，不是 Google Sheets、CMS 或 runtime 外部資料來源。

- `content/products/*.json`：商品內容。每個檔案是一個 Product，`id` 必須等於檔名 stem。
- `content/guides/*.json`：指南內容。每個檔案是一個 Guide，`id` 必須等於檔名 stem。
- `content/links/*.json`：實用連結內容。每個檔案是一個 Link，`id` 必須等於檔名 stem。
- `content/taxonomies/`：分類、通路、標籤、品牌等 taxonomy 定義。內容 JSON 只引用 taxonomy id，不手寫顯示名稱。

## 圖片實體檔與公開 URL

本地圖片實體檔放在 content 目錄下：

- Product 圖片：`content/products/images/{filename}`
- Guide 圖片：`content/guides/images/{filename}`
- Link 不支援本地 `image_file`，也沒有 `content/links/images/`

`nuxt.config.ts` 透過 Nitro `publicAssets` 將圖片實體檔映射為公開 URL：

| 實體檔目錄 | 公開 URL prefix |
| --- | --- |
| `content/products/images/` | `/images/products/` |
| `content/guides/images/` | `/images/guides/` |

Content source JSON 不手寫 `/images/...` 公開路徑。本地圖片使用 `image_file` 填單一檔名，例如：

```json
{
  "image_file": "2026-06-02-benq-rd280u.jpg",
  "image_url": null
}
```

Product 圖片來源必須剛好擇一：本地 `image_file` 或 HTTP(S) `image_url`。Guide 可無圖，也可使用本地 `image_file` 或 HTTP(S) `image_url`，但不可同時填兩者。Link 不支援 `image_file`，`image_url` 只能是 HTTP(S)、`null` 或省略。

## Runtime 與 search resolved URL

Runtime view model 與 search index 不把 `image_file` 直接交給 UI，而是在 mapping 階段 resolve 成 `<img src>` 可使用的 URL：

| Content type | Source 欄位 | Runtime / search `image_url` |
| --- | --- | --- |
| Product | `image_file: "foo.jpg"` | `/images/products/foo.jpg` |
| Guide | `image_file: "bar.webp"` | `/images/guides/bar.webp` |
| Link | HTTP(S) `image_url` 或無圖 | 原 HTTP(S) URL 或 `null` |

因此 content authoring 時只需管理檔名與實體檔位置；UI、search autocomplete、產品詳情與 resource rows 會收到 resolved `image_url`。

## Generated artifacts

`public/search-index.json` 是 generated artifact，由 `scripts/build-search-index.ts` 產生，納入 published products、guides、links。內容或 taxonomy 變更後必須重建：

```bash
pnpm build:search-index
```

`pnpm generate` 會先執行 `pnpm build:search-index`，再產生 static output 到 `.output/public`。交付前若有內容、taxonomy、routing 或 publicAssets 相關變更，應執行 `pnpm generate`，並用 `node scripts/assert-runtime-google-sheet-clean.ts` 確認公開 runtime 沒有 Google Sheets 指標。
