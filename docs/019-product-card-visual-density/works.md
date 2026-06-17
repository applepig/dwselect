# Works

## 2026-06-16

- 以 agent-browser 檢查首頁 mobile、iPad、desktop、ultrawide viewport。
- 確認問題集中在深色背景髒感、product card padding 過厚、價格與通路 overlay 壓在行銷圖片上。
- 決策：先做純 CSS／輕量 markup 調整，不更動內容資料結構與商品圖片來源。
- TDD Red：更新 `tests/nuxt-smoke.test.ts` 的 product card 視覺契約，確認目前 overlay markup 會讓測試失敗；第一次執行缺 APP_URL 被環境阻擋，補 `APP_URL=dwselect.toybox.local` 後看到預期失敗。
- M1：移除深色首頁主背景的琥珀斜向漸層，改用 `var(--dw-bg)`；移除 product image overlay，將價格與通路移入文字區底部 meta row；圖片維持滿版切齊卡片上緣與左右，文字 padding 由 12px 收斂為 10px。
- M2：`APP_URL=dwselect.toybox.local pnpm test tests/nuxt-smoke.test.ts` 通過；`pnpm lint:file -- app/components/product-card.vue tests/nuxt-smoke.test.ts` 通過；`APP_URL=dwselect.toybox.local pnpm test:e2e tests/e2e/compact-app.spec.ts` 已跑過 phone/tablet/desktop 主要 responsive/no-overflow 流程但受 240s 工具 timeout 中止於第 55/60；另以 `--project=desktop --grep "uses the wide desktop canvas"` 補跑 ultrawide grid 檢查並通過。
- 補修：main agent 以 agent-browser 發現 Nuxt UI `UCard` body 仍帶 `sm:p-6`，導致 sm 以上圖片左右內縮；將 product card `ui.body` 改為 `p-0 sm:p-0`，並在 smoke test 加入防回歸檢查。驗證：`APP_URL=dwselect.toybox.local pnpm test tests/nuxt-smoke.test.ts` 通過，`pnpm lint:file -- app/components/product-card.vue tests/nuxt-smoke.test.ts` 通過。
- 追加需求：商品名稱／描述文字區固定為三行高度，讓同一 row 的價格與通路列能對齊。
- TDD Red：在 `tests/nuxt-smoke.test.ts` 增加 product card 文字高度防回歸檢查，要求商品名稱固定兩行、描述固定一行；執行 `APP_URL=dwselect.toybox.local pnpm test tests/nuxt-smoke.test.ts` 看到缺少 `block-size` 的預期失敗。
- 補修：以純 CSS 將 `.product-name` 固定 `block-size: 2.7em` 並維持兩行 clamp，將 `.product-summary` 改為一行 clamp 與 `block-size: 1.55em`，合計固定三行文字高度；不改資料結構、圖片、排序或 routing。驗證：`APP_URL=dwselect.toybox.local pnpm test tests/nuxt-smoke.test.ts` 通過，`pnpm lint` 通過。
