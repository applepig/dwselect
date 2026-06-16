import type { Guide } from '../product-schema.ts'
import { compareNullableTimestampDesc } from './compare-nullable-timestamp-desc.ts'
import { compareText } from './compare-text.ts'

export function compareGuides(left_guide: Guide, right_guide: Guide): number {
  const published_at_order = compareNullableTimestampDesc(left_guide.published_at, right_guide.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return compareText(left_guide.title, right_guide.title)
}
