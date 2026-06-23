import type { Guide, Product } from '../../app/utils/product-schema.ts'
import type { GuideDetailView, RelatedProductCardView } from '../../app/utils/public-content-view-types.ts'
import { extractContentId } from '../../app/utils/content/extract-content-id.ts'
import { resolveGuideImageUrl } from '../../app/utils/content-images/resolve-guide-image-url.ts'
import { mapProductCardBase } from './map-product-card-fields.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

export function mapGuideDetail(
  guide: Guide,
  all_products: Product[],
  labels: TaxonomyLabelResolver,
): GuideDetailView {
  return {
    id: extractContentId(guide.id),
    title: guide.title,
    summary: guide.summary,
    body: guide.body ?? '',
    hero_image_url: resolveGuideImageUrl(guide) ?? '',
    hero_alt: guide.title,
    category_labels: guide.category_ids.map((category_id) => labels.getCategoryLabel(category_id)),
    tag_labels: guide.tag_ids.map((tag_id) => labels.getContentTagLabel(tag_id)),
    source_url: guide.source_url,
    related_products: getGuideRelatedProductCards(guide, all_products, labels),
  }
}

function getGuideRelatedProductCards(
  guide: Guide,
  all_products: Product[],
  labels: TaxonomyLabelResolver,
): RelatedProductCardView[] {
  const published_products_by_id = new Map(
    all_products
      .filter((product) => product.status === 'published')
      .map((product) => [extractContentId(product.id), product]),
  )

  // Why: 依 related_product_ids 的撰寫順序輸出，讓站長在 JSON 裡的排序就是頁面呈現順序。
  return guide.related_product_ids
    .map((related_id) => published_products_by_id.get(extractContentId(related_id)))
    .filter((product): product is Product => product !== undefined)
    .map((product) => mapProductCardBase(product, labels))
}
