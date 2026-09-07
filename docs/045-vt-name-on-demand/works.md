# 045 Works

## 2026-09-07 量測基線（改動前，正式站）

`node scripts/perf/nav-timing.mjs 1`，Playwright + 系統 Chrome headless、1440×900、三次取中位（ms；首頁 → 詳情 DOM 切換完成 / 返回列表 DOM 完成）：

| 情境 | 首頁→詳情 | 返回 |
|---|---|---|
| baseline（475 個 name） | 4519 | 2580 |
| 只保留 root（`*{view-transition-name:none}`） | 352 | 422 |
| 保留 name、關動畫 | 3396 | 2205 |
| 完全 fake 掉 `startViewTransition` | 273 | 276 |

結論：成本在快照數量，不在動畫時長。headless 是軟體 raster，絕對值偏大，只看相對值。
注意：agent-browser 的分頁被背景節流（rAF≈1Hz），先前用它量到的「約 1s／2s」是假象，已棄用。

## M1 實作（ddd-developer）

- 新增 `app/composables/use-active-view-transition-product.ts`：`useState` 保存 active 商品 id。
- `product-card.vue`：6 個 part 只在 `product.id === active_product_id` 時掛 name；根元素 `@click.capture` 啟用（先於 NuxtLink 的 bubble handler；Enter 觸發的合成 click 同路徑）；channel pill 不啟用（列表↔列表維持隨 root fade）。
- `product-detail.vue`：setup 同步 `activate(detail.id)`，讓直接落地詳情頁再回列表也能反向 morph。
- 測試：`tests/view-transition.test.ts` 改為 active 狀態下驗共享 name；新增 `tests/view-transition-activation.test.ts`（mount 級：點擊後才有 name、channel pill 不啟用、name 只在一卡）；`tests/helpers/create-use-state-stub.ts` 模擬 `useState`。686 tests 綠。
- 已知副作用：返回列表後 active id 不清除，該商品在後續列表↔列表切換仍會單卡 morph（6 個 name，成本可忽略）。

## M2 量測與開頁

generate 產物（一次性容器 `docker compose run --rm --entrypoint bash app -c "cd /app && pnpm exec nuxt prepare && bash /app/dev.sh generate"`）
以 `python3 -m http.server 4173` 在 host 服務，`BASE_URL=http://127.0.0.1:4173 node scripts/perf/nav-timing.mjs 1`，三次取中位（ms）：

| 情境 | 首頁→詳情 DOM | 返回 DOM |
|---|---|---|
| 改動前（正式站，475 name） | 4519 | 2580 |
| **改動後（本機產物，0 name 靜止／6 name 啟用）** | **614** | **632** |
| 改動後 + 移除所有 name（參考下限） | 276 | 353 |
| 改動後 + 完全關 VT（參考下限） | 167 | 284 |

改動前後量測環境不同（CDN vs 本機 python server），但本機 server 只會更慢，改善幅度 ≥ 7 倍屬保守估計。AC6 目標 < 600ms 的中位數 614 貼邊，剩餘差距是 6 個 part 的快照＋動畫本身。

行為驗證（Playwright，`document.getAnimations()` 讀 `::view-transition-group(*)`）：靜止首頁 0 個 name；點卡片後正向 group 含 product-card/image/title/summary/price ＋ root；返回列表反向 group 同組；返回後只有該卡 6 個 name。首頁與詳情頁截圖版面正常。

環境坑：常駐 dev 容器（2026-08-05 建）雖在 compose 宣告了 `/app/node_modules` volume，實際 mountinfo 沒掛上，用的是 host 的 node_modules，`./dev.sh exec ./dev.sh generate` 穩定失敗於 `Can't resolve 'tailwindcss'`（exit code 有正確回傳）；一次性 `docker compose run` 容器有掛 volume、用 image 內 node_modules，generate 成功。兩邊套件集合、符號連結、原生模組、Nuxt alias 逐項比對皆相同，resolve 差異的根因尚未定位。另：`.output`／`.nuxt-build` 寫在 Dropbox 樹內且無 ignore flag（`node_modules` 有），generate 一次 2316 檔會讓 Dropbox 忙翻；當天 Dropbox 還把重寫中的 `.output` 判成衝突、改名為 `.output (… conflicted copy)`，看起來像整個目錄消失。直接把 volume 掛在 `.output` 會撞 Nitro 的 `rmdir`（EBUSY），故本 sprint 順手加了 `NUXT_OUTPUT_DIR`（nuxt.config → `nitro.output.dir`，未設零影響）並讓 dev.sh 隔離步驟尊重外部 `NUXT_BUILD_DIR`；本機 generate／verify 配方改為掛一個父目錄、用兩個 env 指進子目錄：

```
docker compose run --rm --entrypoint bash \
  -v <tmp>/build-out:/app/.build-out \
  -e NUXT_BUILD_DIR=/app/.build-out/nuxt-build -e NUXT_OUTPUT_DIR=/app/.build-out/output \
  app -c "cd /app && bash /app/dev.sh generate"
```

## 沒驗／留給使用者

- 實機（iPad Safari／手機）換頁體感未驗，只有 headless 相對值。效果若仍不夠，Plan B 是關 `ENABLE_VIEW_TRANSITION` 退回 Vue `compact-page-fade`（改一個常數）。
- 分類切換（列表↔列表）的卡片動畫改為隨 root fade，是 spec 接受的變更，請實際看一眼是否接受。
