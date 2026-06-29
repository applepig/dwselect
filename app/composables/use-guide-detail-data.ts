import type { GuideDetailView } from '../utils/public-content-view-types'
import { fetchGuideDetail } from '../utils/fetch-guide-detail'

// 028 拆分：詳情頁只 fetch 自己那一筆 detail（per-id key，獨立 cache），不再載入整包 content payload。
// id 不存在時 per-id route 回 404、$fetch reject，data 維持 null → 詳情頁 throw createError(404)。
export async function useGuideDetailData(guide_id: string) {
  const { data: guide_detail } = await useAsyncData(
    `guide-detail-${guide_id}`,
    () => fetchGuideDetail(guide_id),
  )

  return computed<GuideDetailView | null>(() => guide_detail.value ?? null)
}
