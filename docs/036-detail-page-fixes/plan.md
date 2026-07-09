# 036 Detail Page Fixes Plan

## 背景

036 原先承接 035 後續：部署到 Cloudflare 取得 preview URL 後，先跑 E2E 再 launch，並改善 artifact gate。使用者現在希望把公開 detail 頁的使用者互動也納入 036 scope，先加入低後端成本的留言與分享功能。

本專案是 Nuxt SSG 公開內容站，production 以 `.output/public` 靜態輸出為準；公開 runtime 不應 fetch CMS 或內容來源。互動功能若需要第三方 script 或外部服務，必須明確隔離在前端互動元件中，避免影響 content payload 與 static generate 的 SSOT。

## 已確認方向

- 留言系統採用 Disqus。
- 分享功能採用手刻 share buttons，不使用 ShareThis／AddThis 之類第三方分享套件。
- 分享功能優先支援 detail 頁可直接分享目前 URL。
- Facebook Comments／Facebook Like plugin 不納入本 sprint。
- 自製 like／reaction API 不納入本 sprint。

## 初步範圍

- 在 product detail 與 guide detail 頁加入 Disqus 留言區。
- Disqus 應以 content id／route 作為 thread identifier，避免標題或 URL 顯示文字調整後產生新 thread。
- Disqus 載入應避免阻塞主要內容 render；若第三方 script 失敗，detail 頁主內容仍可正常閱讀。
- 在 product detail 與 guide detail 頁加入分享按鈕區塊。
- 分享按鈕以自製元件處理，不引入第三方 sharing SDK。
- 手機／支援瀏覽器優先使用 Web Share API；不支援時提供平台連結與 copy link fallback。
- 平台初步納入：LINE、Facebook share、X／Twitter、copy link。其他平台待 spec 階段決定。
- 分享 URL 應使用 canonical site URL，不使用 dev host 或相對 URL。

## 非目標

- 不新增會員系統。
- 不新增站內 like／reaction／收藏後端。
- 不導入 Facebook Like Button、Facebook Comments Plugin 或 Facebook SDK 作為核心互動。
- 不導入第三方分享聚合服務。
- 不改 content schema。
- 不讓公開 runtime 讀取 Git-backed content 以外的內容來源。

## 待確認

- Disqus shortname 與正式站 domain 設定由哪個環境變數提供。
- Disqus 是否只在 production／preview 啟用，或 dev 也允許載入。
- 留言區要出現在所有 detail 頁，還是只限 guide detail／product detail 其中之一。
- 分享按鈕的最終平台清單與排序。
- Copy link 成功後的 UI feedback 樣式。

## 推薦方案

採用「Disqus + 自製 share buttons」作為 036 的互動功能範圍。這能快速提供留言與分享，不需要在本 sprint 承擔會員、資料庫、spam 防護、reaction 計數等後端責任；代價是 Disqus 帶有第三方 script、隱私與效能成本，spec 階段需明確定義 lazy load、noscript／失敗 fallback 與環境開關。
