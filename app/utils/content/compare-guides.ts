import type { Guide } from '../product-schema.ts'
import { compareNullableTimestampDesc } from './compare-nullable-timestamp-desc.ts'
import { compareText } from './compare-text.ts'

export function compareGuides(left_guide: Guide, right_guide: Guide): number {
  const updated_at_order = compareNullableTimestampDesc(left_guide.updated_at, right_guide.updated_at)

  if (updated_at_order !== 0) {
    return updated_at_order
  }

  return compareText(left_guide.title, right_guide.title)
}
