import type { Guide, LinkDefinition } from '../../app/utils/product-schema.ts'
import type { CompactResourceRow } from '../../app/utils/published-products/types.ts'
import { compareGuides } from '../../app/utils/content/compare-guides.ts'
import { resolveGuideImageUrl } from '../../app/utils/content-images/resolve-guide-image-url.ts'
import type { TaxonomyLabelResolver } from '../../app/utils/content/taxonomy-labels.ts'

export function mapGuideRows(guides: Guide[], labels: TaxonomyLabelResolver): CompactResourceRow[] {
  return guides
    .filter((guide) => guide.status === 'published')
    .toSorted(compareGuides)
    .map((guide) => mapGuideToRow(guide, labels))
}

export function mapLinkRows(links: LinkDefinition[]): CompactResourceRow[] {
  return links
    .filter((link) => link.status === 'published')
    .toSorted((left_link, right_link) => left_link.sort_order - right_link.sort_order)
    .map(mapLinkToRow)
}

function mapGuideToRow(guide: Guide, labels: TaxonomyLabelResolver): CompactResourceRow {
  const category_labels = guide.category_ids.map((category_id) => labels.getCategoryLabel(category_id))

  return {
    id: guide.id,
    type: 'guide',
    title: guide.title,
    subtitle: guide.summary,
    meta: category_labels.length === 0 ? null : category_labels.join('、'),
    href: guide.source_url,
    image_url: resolveGuideImageUrl(guide),
    icon: 'i-lucide-book-open',
    external: true,
    target: '_blank',
    rel: 'noopener noreferrer',
  }
}

function mapLinkToRow(link: LinkDefinition): CompactResourceRow {
  return {
    id: link.id,
    type: 'link',
    title: link.title,
    subtitle: link.summary,
    meta: link.url,
    href: link.url,
    image_url: link.image_url ?? null,
    icon: link.icon,
    external: true,
    target: '_blank',
    rel: 'noopener noreferrer',
  }
}
