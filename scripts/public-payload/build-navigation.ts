import type { Guide, LinkDefinition, Product } from '../../app/utils/product-schema.ts'
import type { CategoryChipView } from '../../app/utils/public-content-view-types.ts'
import type { CompactSearchTagGroups, CompactTagChip } from '../../app/utils/published-products/types.ts'
import { compareText } from '../../app/utils/content/compare-text.ts'
import type { PublicTaxonomies } from '../../app/utils/public-content-payload.ts'

const POPULAR_TAG_MIN_COUNT = 3
const POPULAR_TAG_MAX_COUNT = 10

export type NavigationPayload = {
  category_chips: CategoryChipView[]
  desktop_category_items: CategoryChipView[]
  popular_search_tags: CompactSearchTagGroups
  counts: {
    products: number
  }
}

export function buildNavigation(
  content: { products: Product[], guides: Guide[], links: LinkDefinition[] },
  taxonomies: PublicTaxonomies,
): NavigationPayload {
  const published_products = content.products.filter((product) => product.status === 'published')
  const category_chips = getCategoryChips(published_products, taxonomies)

  return {
    category_chips,
    desktop_category_items: category_chips,
    popular_search_tags: getPopularSearchTagGroups(content, taxonomies),
    counts: {
      products: published_products.length,
    },
  }
}

function getCategoryChips(published_products: Product[], taxonomies: PublicTaxonomies): CategoryChipView[] {
  const category_counts = new Map<Product['category_id'], number>()

  for (const product of published_products) {
    category_counts.set(product.category_id, (category_counts.get(product.category_id) ?? 0) + 1)
  }

  const visible_categories = taxonomies.categories
    .filter((category) => category.nav_visible)
    .toSorted((left_category, right_category) => left_category.sort_order - right_category.sort_order)

  return [
    {
      id: 'all',
      label: '全部',
      count: published_products.length,
    },
    ...visible_categories
      .map((category) => ({
        id: category.id,
        label: category.short_label,
        count: category_counts.get(category.id) ?? 0,
      }))
      .filter((category) => category.count > 0),
  ]
}

function getPopularSearchTagGroups(
  content: { products: Product[], guides: Guide[], links: LinkDefinition[] },
  taxonomies: PublicTaxonomies,
): CompactSearchTagGroups {
  const tag_counts = new Map<string, number>()
  const brand_counts = new Map<string, number>()
  const tag_labels = new Map(taxonomies.tags.map((tag) => [tag.id, tag.label]))
  const brand_labels = new Map(taxonomies.brands.map((brand) => [brand.id, brand.label]))

  // Why: 以 tag id（非 label）為計數 key，讓熱門 chip 能攜帶 id 深連 /tag/{id}；
  // label 可能撞名或非唯一，id 才是 taxonomy 的精準鍵。
  addKnownTagCounts(tag_counts, getPublishedTagIds(content.products), tag_labels)
  addKnownTagCounts(tag_counts, getPublishedTagIds(content.guides), tag_labels)
  addKnownTagCounts(tag_counts, getPublishedTagIds(content.links), tag_labels)
  addKnownTagCounts(brand_counts, getPublishedTagIds(content.products), brand_labels)

  return {
    tags: getSortedPopularChips(tag_counts, tag_labels),
    brands: getSortedPopularChips(brand_counts, brand_labels),
  }
}

function getPublishedTagIds(items: Array<{ status: string, tag_ids: string[] }>) {
  return items
    .filter((item) => item.status === 'published')
    .flatMap((item) => item.tag_ids)
}

function addKnownTagCounts(
  tag_counts: Map<string, number>,
  tag_ids: string[],
  tag_labels: Map<string, string>,
) {
  for (const tag_id of tag_ids) {
    const label = tag_labels.get(tag_id)

    if (label === undefined) {
      continue
    }

    tag_counts.set(tag_id, (tag_counts.get(tag_id) ?? 0) + 1)
  }
}

function getSortedPopularChips(tag_counts: Map<string, number>, tag_labels: Map<string, string>): CompactTagChip[] {
  return Array.from(tag_counts, ([id, count]) => ({
    id,
    label: tag_labels.get(id) ?? id,
    count,
    active: false,
  })).filter((tag) => tag.count >= POPULAR_TAG_MIN_COUNT)
    .toSorted((left_tag, right_tag) => {
      if (left_tag.count !== right_tag.count) {
        return right_tag.count - left_tag.count
      }

      return compareText(left_tag.label, right_tag.label)
    })
    .slice(0, POPULAR_TAG_MAX_COUNT)
}
