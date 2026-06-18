import type { PublicContentPayload } from './public-content-payload'

// Universal fetch：server（SSR／prerender）與 client 都走同一個 /api/content.json route contract，
// 不再 server side 直接讀本地 generated JSON 檔；route 在 generate 時被 prerender 成 static file。
export async function fetchPublicContentPayload(): Promise<PublicContentPayload> {
  return await $fetch<PublicContentPayload>('/api/content.json')
}
