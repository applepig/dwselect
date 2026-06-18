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

本地圖片由 `@nuxt/image` 在 runtime 最佳化：`nuxt.config.ts` 設 `image.dir = '../content'`，讓 `<NuxtImg>` 以 `content/` 為來源目錄解析 source 圖片，dev 由 IPX 即時最佳化，不需要先跑 `pnpm build:content-images`。UI 對本地圖片用 `<NuxtImg :src="image_url" format="webp">`，對外部 HTTP(S) 連結圖則用原生 `<img>`。

對外的公開 image src（即 resolved `image_url` 欄位）是 content source 的相對 path，**保留原始副檔名**：

| Source 目錄 | 公開 image src prefix | 範例 |
| --- | --- | --- |
| `content/products/images/` | `/products/images/` | `/products/images/foo.jpg` |
| `content/guides/images/` | `/guides/images/` | `/guides/images/bar.png` |

Content source JSON 不手寫 `/products/images/...` 公開路徑。本地圖片使用 `image_file` 填 source 檔名，例如：

```json
{
  "image_file": "2026-06-02-benq-rd280u.jpg",
  "image_url": null
}
```

Product runtime 與 search 一律使用 same-origin optimized static assets：published Product 必須有本地 `image_file`，`image_url` 必須為 `null` 或省略，不會 fallback 到外部 `image_url`。沒有本地圖片的 legacy / draft Product 必須維持 `status: "draft"`、`image_file: null`、`image_url: null`，不得用外部 `image_url` 假裝可發布。Guide 可無圖，也可使用本地 `image_file`；Guide 外部 `image_url` 不會進 search image。Link 不支援 `image_file`，`image_url` 只能是 HTTP(S)、`null` 或省略。

## Runtime 與 search resolved URL

Runtime view model 與 search index 不把 `image_file` 直接交給 UI，而是在 mapping 階段 resolve 成 source path 形狀的 `image_url`，再交給 `<NuxtImg>` / `@nuxt/image` 最佳化：

| Content type | Source 欄位 | Runtime / search `image_url` |
| --- | --- | --- |
| Product | `image_file: "foo.jpg"` | `/products/images/foo.jpg` |
| Guide | `image_file: "bar.png"` | `/guides/images/bar.png` |
| Link | HTTP(S) `image_url` 或無圖 | 原 HTTP(S) URL 或 `null` |

因此 content authoring 時只需管理檔名與 source 檔位置；UI、search autocomplete、產品詳情與 resource rows 會收到 source path 形狀的 `image_url`，並由 `<NuxtImg>` 在 runtime 轉成 optimized WebP。若 published content 引用的 source image 缺失，`pnpm generate` 前置的 `node scripts/assert-content-images.ts` 會先失敗，避免 runtime 產生 404 圖片 URL。

## Generated artifacts

catalog payload 由 Nuxt server route `GET /api/content.json`（handler 在 `server/api/content.json.get.ts`）即時從 `content/` 產生，app 端（server 與 client）都透過 `$fetch('/api/content.json')` 取得，不再直接讀靜態的 `public/api/content.json`。`pnpm generate` 會把它 prerender 成 `.output/public/api/content.json`。

search index 由 Nuxt server route `GET /search-index.json`（handler 在 `server/routes/search-index.json.get.ts`）產生，納入 published products、guides、links；client MiniSearch fetch 同一個 `/search-index.json` URL。`pnpm generate` 同樣會把它 prerender 成 static file。

本地圖片不再預先產生 `public/images/**` artifact；改由 `@nuxt/image` / IPX 處理：dev 即時最佳化來源圖片，`pnpm generate` 以 ipxStatic 輸出頁面實際用到的 optimized 圖到 `.output/public/_ipx`。

`public/api/content.json`、`public/search-index.json` 與 `public/images/**` 已加入 `.gitignore` 並從版控移除，不再是必須手動重建並 commit 的 artifact；正式 static output 以 `pnpm generate` 的 `.output/public` 為準。sitemap、rss、robots、llms 等 discovery 檔仍由 `pnpm build:public-discovery` 產生並維持 tracked。`build:content-images`、`build:search-index`、`build:public-artifacts` 仍保留為 legacy CLI，但不再是 dev／generate 的必要前置步驟。

`pnpm generate` 現在會跑 `pnpm build:public-discovery && node scripts/assert-content-images.ts && nuxt generate`，再產生 static output 到 `.output/public`。交付前若有內容、圖片、taxonomy、routing 或 public output 相關變更，應執行 `pnpm test`、`pnpm generate`，並用 `node scripts/assert-runtime-google-sheet-clean.ts` 確認公開 runtime 沒有 Google Sheets 指標。
