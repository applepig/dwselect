import type { GuideDetailView } from '../utils/public-content-view-types'
import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'

export async function useGuideDetailData(guide_id: string) {
  const { data: content_payload } = await useAsyncData('public-content', fetchPublicContentPayload)

  return computed<GuideDetailView | null>(() => content_payload.value?.guides.details_by_id[guide_id] ?? null)
}
