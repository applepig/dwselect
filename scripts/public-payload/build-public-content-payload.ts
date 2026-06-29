import type { PublicContentPayload } from '../../app/utils/public-content-payload.ts'
import { compareProducts } from '../../app/utils/content/compare-products.ts'
import type { PublicContentSource } from '../content-reader.ts'
import { PUBLIC_CONTENT_VERSION, SITE_NAME, SITE_URL, isPublished } from '../public-content.ts'
import { buildNavigation } from './build-navigation.ts'
import { mapGuideRows, mapLinkRows } from './map-resource-rows.ts'
import { mapProductCard } from './map-product-card.ts'
import { createTaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

// 028 拆分：共用 payload 只保留列表／導覽所需的 cards / rows / links / navigation / taxonomies。
// 商品／指南完整 detail 改由 per-id route（/api/products|guides/{id}.json）各自取得，
// 不再內嵌全量 details_by_id（消除每頁 _payload.json 隨商品數 O(N) 膨脹）。
export function buildPublicContentPayload(source: PublicContentSource): PublicContentPayload {
  const labels = createTaxonomyLabelResolver(source.taxonomies)
  const sorted_products = source.products
    .filter(isPublished)
    .toSorted((left_product, right_product) => compareProducts(left_product, right_product, source.taxonomies))

  return {
    version: PUBLIC_CONTENT_VERSION,
    site: {
      name: SITE_NAME,
      url: SITE_URL,
    },
    products: {
      cards: sorted_products.map((product) => mapProductCard(product, labels)),
    },
    guides: {
      rows: mapGuideRows(source.guides, labels),
    },
    links: mapLinkRows(source.links),
    navigation: buildNavigation(
      { products: source.products, guides: source.guides, links: source.links },
      source.taxonomies,
    ),
    taxonomies: {
      categories: sortTaxonomies(source.taxonomies.categories),
      channels: sortTaxonomies(source.taxonomies.channels),
      tags: sortTaxonomies(source.taxonomies.tags),
      brands: sortTaxonomies(source.taxonomies.brands),
    },
  }
}

function sortTaxonomies<T extends { id: string, sort_order: number }>(items: T[]) {
  return [...items].toSorted((left_item, right_item) => {
    const sort_order_diff = left_item.sort_order - right_item.sort_order

    if (sort_order_diff !== 0) {
      return sort_order_diff
    }

    return left_item.id.localeCompare(right_item.id)
  })
}
