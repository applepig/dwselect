import type { Product } from '../product-schema'
import type { CategoryChipView } from '../public-content-view-types'

// 合法可選分類集合必須等於導覽實際渲染的 chip 集合（排除 'all'），
// 而非 taxonomies 全集，否則 route parser 會接受 UI 上根本沒有 chip 的分類。
export function getSelectableCategoryIds(category_chips: CategoryChipView[]): Product['category_id'][] {
  return category_chips
    .filter((chip) => chip.id !== 'all')
    .map((chip) => chip.id)
}
