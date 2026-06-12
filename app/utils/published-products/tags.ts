import type { Guide, LinkDefinition, Product } from '../product-schema'
import type { CompactTagChip, TaxonomyDefinitions } from './types'
import { compareText } from './shared'

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

  for (const tag_id of getPublishedContentTagIds(content)) {
    const label = getTagLabel(tag_id, taxonomies)
    tag_counts.set(label, (tag_counts.get(label) ?? 0) + 1)
  }

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

function getPublishedContentTagIds(content: {
  products: Product[]
  guides: Guide[]
  links: LinkDefinition[]
}) {
  return [
    ...content.products
      .filter((product) => product.status === 'published')
      .flatMap((product) => product.tag_ids),
    ...content.guides
      .filter((guide) => guide.status === 'published')
      .flatMap((guide) => guide.tag_ids),
    ...content.links
      .filter((link) => link.status === 'published')
      .flatMap((link) => link.tag_ids),
  ]
}

function getTagLabel(tag_id: string, taxonomies: TaxonomyDefinitions) {
  return taxonomies.tags?.find((tag) => tag.id === tag_id)?.label ?? tag_id
}
