import type { Guide, LinkDefinition, Product } from '../product-schema'
import type { CompactTagChip, TaxonomyDefinitions } from './types'
import { compareText, getContentTagLabel, getProductTagLabel } from './shared'

export function getTagChips(
  content: {
    products: Product[]
    guides: Guide[]
    links: LinkDefinition[]
  },
  selected_tags: string[],
  taxonomies: TaxonomyDefinitions,
  max_count = 10,
): CompactTagChip[] {
  const selected_tag_set = new Set(selected_tags)
  const tag_counts = new Map<string, number>()

  addTagCounts(tag_counts, getPublishedProductTagIds(content.products), (tag_id) => getProductTagLabel(tag_id, taxonomies))
  addTagCounts(tag_counts, getPublishedGuideTagIds(content.guides), (tag_id) => getContentTagLabel(tag_id, taxonomies))
  addTagCounts(tag_counts, getPublishedLinkTagIds(content.links), (tag_id) => getContentTagLabel(tag_id, taxonomies))

  return Array.from(tag_counts, ([label, count]) => ({
    label,
    count,
    active: selected_tag_set.has(label),
  })).toSorted((left_tag, right_tag) => {
    if (left_tag.count !== right_tag.count) {
      return right_tag.count - left_tag.count
    }

    return compareText(left_tag.label, right_tag.label)
  }).slice(0, max_count)
}

function addTagCounts(
  tag_counts: Map<string, number>,
  tag_ids: string[],
  get_label: (tag_id: string) => string,
) {
  for (const tag_id of tag_ids) {
    const label = get_label(tag_id)
    tag_counts.set(label, (tag_counts.get(label) ?? 0) + 1)
  }
}

function getPublishedProductTagIds(products: Product[]) {
  return products
    .filter((product) => product.status === 'published')
    .flatMap((product) => product.tag_ids)
}

function getPublishedGuideTagIds(guides: Guide[]) {
  return guides
    .filter((guide) => guide.status === 'published')
    .flatMap((guide) => guide.tag_ids)
}

function getPublishedLinkTagIds(links: LinkDefinition[]) {
  return links
    .filter((link) => link.status === 'published')
    .flatMap((link) => link.tag_ids)
}
