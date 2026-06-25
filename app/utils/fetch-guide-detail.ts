import type { GuideDetailView } from './public-content-view-types'

// per-id detail fetch：與 fetchPublicContentPayload 同樣走 universal $fetch，server／client 同源。
// route 在 generate 時 prerender 成 static /api/guides/{id}.json；id 不存在時 route 回 404。
export async function fetchGuideDetail(id: string): Promise<GuideDetailView> {
  return await $fetch<GuideDetailView>(`/api/guides/${id}.json`)
}
