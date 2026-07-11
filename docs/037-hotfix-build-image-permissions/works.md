# Hotfix: Build Image Permissions

## 問題描述
- **症狀**：以 `NUXT_MODE=build ./dev.sh restart` 啟動 app service 時，`build:content-images` 無法 unlink `public/images/**/*.webp`，container 因此反覆重啟。
- **預期行為**：build mode 可重建 generated images、完成 Nuxt static generate，並進入 Nuxt preview。
- **影響範圍**：本機 Docker production build mode。

## 根因分析
- **根因**：bind-mounted `public/images/products` 與 `public/images/guides` 是 `root:root`、模式 `755`，但 entrypoint 以 uid 1000 的 `node` 使用者執行 image builder，無法刪除該目錄內的舊產物。
- **定位過程**：container log 在 `build:content-images` 的 `rm(output_dir, { recursive: true, force: true })` 失敗；host `stat` 確認失敗路徑及其父目錄為 `root:root`，而目前 host 使用者 uid/gid 為 `1000:1000`。
- **受影響的檔案**：僅 `public/images/` 下的 generated WebP output 與本紀錄檔。

## 修復內容
- **修了什麼**：將 `public/images/` owner 還原為目前 host 使用者，讓 container 的 uid 1000 `node` 可重建 generated output。
- **測試**：不新增 unit test；此問題是既有 bind-mounted filesystem metadata，直接以 build-mode container generate 與 preview 作為行為驗證。
- **驗證結果**：`NUXT_MODE=build ./dev.sh restart` 成功重建 83 張圖片、prerender 548 個 routes，並啟動 Nuxt preview；`https://dwselect.toybox.local/` 可載入首頁。
