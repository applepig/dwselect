# Content 檔案關係

## Content source

本站公開內容的 SSOT 是 Git-backed `content/` 檔案，不是 Google Sheets、CMS 或 runtime 外部資料來源。

- `content/products/*.json`：商品內容。每個檔案是一個 Product，`id` 必須等於檔名 stem。
- `content/guides/*.json`：指南內容。每個檔案是一個 Guide，`id` 必須等於檔名 stem。
- `content/links/*.json`：實用連結內容。每個檔案是一個 Link，`id` 必須等於檔名 stem。
- `content/taxonomies/`：分類、通路、標籤、品牌等 taxonomy 定義。內容 JSON 只引用 taxonomy id，不手寫顯示名稱。

`scripts/content-reader.ts` 是唯一 content 存取層；它以 filesystem JSON + zod schema / taxonomy reference 驗證讀取內容，供 search index、public discovery 與 SSG runtime payload 共用。

## 圖片 source 與公開 URL

本地圖片 source 檔放在 content 目錄下，跟 JSON 一起由 Git 管理：

- Product 圖片：`content/products/images/{filename}`
- Guide 圖片：`content/guides/images/{filename}`
- Link 不支援本地 `image_file`，也沒有 `content/links/images/`

build 階段由 `scripts/build-content-images.ts` 讀取 published Product / Guide 的 `image_file`，用 sharp 轉成 resized WebP，輸出到公開目錄：

| Source 目錄 | Generated public artifact | Runtime URL prefix |
| --- | --- |
| `content/products/images/` | `public/images/products/*.webp` | `/images/products/` |
| `content/guides/images/` | `public/images/guides/*.webp` | `/images/guides/` |

Content source JSON 不手寫 `/images/...` 公開路徑。本地圖片使用 `image_file` 填 source 檔名，例如：

```json
{
  "image_file": "2026-06-02-benq-rd280u.jpg",
  "image_url": null
}
```

Product runtime 與 search 一律使用 same-origin optimized static assets：published Product 必須有本地 `image_file`，`image_url` 必須為 `null` 或省略，不會 fallback 到外部 `image_url`。沒有本地圖片的 legacy / draft Product 必須維持 `status: "draft"`、`image_file: null`、`image_url: null`，不得用外部 `image_url` 假裝可發布。Guide 可無圖，也可使用本地 `image_file`；Guide 外部 `image_url` 不會進 search image。Link 不支援 `image_file`，`image_url` 只能是 HTTP(S)、`null` 或省略。

## Runtime 與 search resolved URL

Runtime view model 與 search index 不把 `image_file` 直接交給 UI，而是在 mapping 階段 resolve 成 `<img src>` 可使用的 URL：

| Content type | Source 欄位 | Runtime / search `image_url` |
| --- | --- | --- |
| Product | `image_file: "foo.jpg"` | `/images/products/foo.webp` |
| Guide | `image_file: "bar.png"` | `/images/guides/bar.webp` |
| Link | HTTP(S) `image_url` 或無圖 | 原 HTTP(S) URL 或 `null` |

因此 content authoring 時只需管理檔名與 source 檔位置；UI、search autocomplete、產品詳情與 resource rows 會收到 resolved WebP `image_url`。若 published content 引用的 source image 缺失或無法由 sharp 轉檔，`pnpm build:content-images` 與 `pnpm generate` 會失敗，避免 runtime 產生 404 圖片 URL。

## Generated artifacts

`public/images/**` 是 generated public artifact，由 `scripts/build-content-images.ts` 產生 resized WebP。配合目前 repo 既有 public generated artifacts，這些檔案需要保留在版本控制。內容 JSON 或 source 圖片變更後必須重建：

```bash
pnpm build:content-images
```

`public/search-index.json` 是 generated artifact，由 `scripts/build-search-index.ts` 產生，納入 published products、guides、links。內容或 taxonomy 變更後必須重建：

```bash
pnpm build:search-index
```

`public/api/content.json` 是 public discovery payload，由 `scripts/build-public-discovery.ts` 產生，讓 app 在 SSG 階段與 client fallback 都讀同一份靜態 JSON：

```bash
pnpm build:public-discovery
```

`pnpm generate` 會先執行 `pnpm build:content-images` 與 `pnpm build:public-artifacts`（後者單次讀取 content source 後同時產生 search index 與 public discovery payload），再產生 static output 到 `.output/public`。交付前若有內容、圖片、taxonomy、routing 或 public output 相關變更，應執行 `pnpm test`、`pnpm generate`，並用 `node scripts/assert-runtime-google-sheet-clean.ts` 確認公開 runtime 沒有 Google Sheets 指標。
