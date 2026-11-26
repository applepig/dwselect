# Hotfix: 直接開啟非首頁時畫面凍結約 4 秒

## 問題描述
- **症狀**：正式站直接開啟 `/guide/2026-06-02-japanese-rice-intro/`，載入後卡住數秒無法操作；console 有 `Transition was aborted because of timeout in DOM update`。使用者原以為是 Disqus。
- **預期行為**：直接開啟任何頁面，hydration 後立即可操作，不出現 VT 逾時錯誤；站內真實換頁的 View Transition 不受影響。
- **影響範圍**：所有非首頁的直接開啟／重新整理（詳情頁、`/guide/`、`/links/` 等目錄路徑）。

## 根因分析
- **根因**：正式站把目錄路徑 308 到帶斜線 URL，prerender 的 `payload.path` 不帶斜線；Nuxt router 的 hydration deferred route 會在 `/x` 與 `/x/` 之間 replace 兩次。Nuxt VT plugin 把它當換頁開 transition，但 NuxtPage key 相同不重 render，`page:finish` 不觸發，transition 卡到瀏覽器 4 秒逾時。
- **定位過程**：Playwright 不捲動（Disqus 未載入）一樣重現，排除 Disqus；hook `startViewTransition`／`history.replaceState` 追到 Nuxt `router.js` 的 `hasDeferredRoute` 與 `view-transitions.client.js`。Disqus 的 `lounge.bundle` `browsingTopics` 錯誤是第三方自身問題，與卡頓無關。
- **受影響的檔案**：`app/middleware/disable-vue-transitions.global.ts`、`tests/disable-vue-transitions.test.ts`

## 修復內容
- **修了什麼**：middleware 在 `to`／`from` 只差尾斜線時設 `to.meta.viewTransition = false`。屬 workaround，移除條件：Nuxt 上游修正，或站台 URL 與 `payload.path` 尾斜線一致。
- **測試**：新增 6 條 middleware 行為測試（3 條尾斜線導航關 VT、3 條真實換頁保留 VT），修前 3 紅。
- **驗證結果**：test 700 passed、lint、knip、typecheck、generate 全過。runtime 以 Playwright 把正式站網域導到本機 generate 產物（模擬 308 補斜線）：修前直接開啟皆逾時，修後無 transition、無錯誤；首頁→商品詳情、`/guide/`→指南詳情的 VT 仍正常 finished。載入 1.5 秒時點側欄「連結」：修前點擊被吞、10 秒內未換頁；修後 164～240ms 換頁。
- **未驗**：未部署到正式站實測；本機未跑 E2E（交給 CI）；未測 Safari／Firefox。
- **留給使用者**：更根本的做法是讓站台 URL 尾斜線與 canonical（不帶斜線）一致，需動部署設定，未做。
