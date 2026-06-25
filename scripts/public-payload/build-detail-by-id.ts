import type { GuideDetailView, ProductDetailView } from '../../app/utils/public-content-view-types.ts'
import { extractContentId } from '../../app/utils/content/extract-content-id.ts'
import type { PublicContentSource } from '../content-reader.ts'
import { isPublished } from '../public-content.ts'
import { mapGuideDetail } from './map-guide-detail.ts'
import { mapProductDetail } from './map-product-detail.ts'
import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

// per-id detail builder：薄包裝，複用既有 mapProductDetail／mapGuideDetail 與 content.json 同一條 source／label
// 讀法。只挑出 id 對應的那一筆 detail，避免把全量 detail 內嵌進共用 payload（028 拆分核心）。
// 找不到（不存在／未發布）回 null，由 route 轉成 404（spec Case 1）。
export function buildProductDetail(source: PublicContentSource, id: string): ProductDetailView | null {
  const published_products = source.products.filter(isPublished)
  const product = published_products.find((candidate) => extractContentId(candidate.id) === id)

  if (product === undefined) {
    return null
  }

  const labels = createTaxonomyLabelResolver(source.taxonomies)

  return mapProductDetail(product, published_products, labels)
}

export function buildGuideDetail(source: PublicContentSource, id: string): GuideDetailView | null {
  const published_guides = source.guides.filter(isPublished)
  const guide = published_guides.find((candidate) => extractContentId(candidate.id) === id)

  if (guide === undefined) {
    return null
  }

  const labels = createTaxonomyLabelResolver(source.taxonomies)
  const published_products = source.products.filter(isPublished)

  return mapGuideDetail(guide, published_products, labels)
}
