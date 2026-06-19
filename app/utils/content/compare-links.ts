import type { LinkDefinition } from '../product-schema.ts'
import { compareNullableTimestampDesc } from './compare-nullable-timestamp-desc.ts'
import { compareText } from './compare-text.ts'

export function compareLinks(left_link: LinkDefinition, right_link: LinkDefinition): number {
  const sort_order = left_link.sort_order - right_link.sort_order

  if (sort_order !== 0) {
    return sort_order
  }

  const updated_at_order = compareNullableTimestampDesc(left_link.updated_at, right_link.updated_at)

  if (updated_at_order !== 0) {
    return updated_at_order
  }

  const title_order = compareText(left_link.title, right_link.title)

  if (title_order !== 0) {
    return title_order
  }

  return left_link.id.localeCompare(right_link.id)
}
