import type { Product } from '../../app/utils/product-schema.ts'
import type { ProductDetailView } from '../../app/utils/public-content-view-types.ts'
import { getPrimaryOffer } from '../../app/utils/content/primary-offer.ts'
import { splitDetailTaxonomyTags } from '../../app/utils/content/split-detail-taxonomy-tags.ts'
import { mapProductCardFields } from './map-product-card-fields.ts'
import { getRelatedProductCards } from './map-related-product-card.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

const DETAIL_FINE_PRINT = '價格與庫存以通路頁面為準。'

export function mapProductDetail(
  product: Product,
  all_products: Product[],
  labels: TaxonomyLabelResolver,
): ProductDetailView {
  // channel_ids 僅供 card view 的 channel 頁篩選；detail view 以單數 channel_id 顯示／深連，故剝除（_ 前綴標示刻意未用）。
  // tag_ids／tag_labels 由 split 取代（剝離 brand id），避免 brand pill 連到死路由 /tag/{brand}（AC24b）。
  const { image_url, channel_ids: _channel_ids, tag_ids: _tag_ids, tag_labels: _tag_labels, ...card_fields } = mapProductCardFields(product, labels)
  const taxonomy_tags = splitDetailTaxonomyTags(product.tag_ids, labels)

  return {
    ...card_fields,
    summary: product.summary,
    long_description: product.long_description,
    llm_description: product.llm_description,
    hero_image_url: image_url,
    hero_alt: product.name,
    category_id: product.category_id,
    tag_ids: taxonomy_tags.tag_ids,
    tag_labels: taxonomy_tags.tag_labels,
    brand_ids: taxonomy_tags.brand_ids,
    brand_labels: taxonomy_tags.brand_labels,
    buy_url: getPrimaryOffer(product).url,
    fine_print: DETAIL_FINE_PRINT,
    related_products: getRelatedProductCards(product, all_products, labels),
  }
}
