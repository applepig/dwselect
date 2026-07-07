// route.params.id 正規化：Nuxt 單段動態路由通常回 string，catch-all／異常情形可能回 string[]；
// 取首段、缺席時回 fallback。category-chip-bar 以 ALL_CATEGORIES_ID 當 fallback，其餘頁面用空字串。
export function resolveRouteId(raw: string | string[] | undefined, fallback = ''): string {
  return (Array.isArray(raw) ? raw[0] : raw) ?? fallback
}
