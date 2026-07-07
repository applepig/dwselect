// 站台 URL 單一來源：由 APP_URL 環境變數導出，開發站／正式站隨環境分流（ADR-035-2）。
// Node-only（讀 process.env）；缺 APP_URL 於「呼叫時」throw，不在 module top-level eager throw，
// 避免 vitest／consumer 光是 import 就炸（介面草案硬約束）。
export function getSiteUrl(): string {
  const app_url = process.env.APP_URL

  if (!app_url) {
    throw new Error('APP_URL 環境變數未設定——無法導出站台 URL；請在 .env 設定，例如 APP_URL=dwselect.toybox.local')
  }

  return `https://${app_url}/`
}
