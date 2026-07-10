// DISQUS_SHORTNAME 與 SITE_URL 同為 build-time define：未設定時烤入空字串，讓 dev 與
// preview 預設不載第三方 script（ADR-036-2）。
declare const __DW_DISQUS_SHORTNAME__: string

export function getDisqusShortname(): string {
  return __DW_DISQUS_SHORTNAME__.trim()
}
