import type { CategoryDefinition, ChannelDefinition, Guide, LinkDefinition, Product, TagDefinition } from '../utils/product-schema'
import type { TaxonomyDefinitions } from '../utils/published-products/types'

export async function useCatalogData() {
  const products_request = useAsyncData('published-products', () => queryCollection('products')
    .where('status', '=', 'published')
    .order('category_id', 'ASC')
    .order('published_at', 'DESC')
    .order('name', 'ASC')
    .all())
  const category_taxonomy_request = useAsyncData('taxonomy-categories', () => queryCollection('categories').first())
  const channel_taxonomy_request = useAsyncData('taxonomy-channels', () => queryCollection('channels').first())
  const tag_taxonomy_request = useAsyncData('taxonomy-tags', () => queryCollection('tags').first())
  const guides_request = useAsyncData('content-guides', () => queryCollection('guides')
    .where('status', '=', 'published')
    .order('published_at', 'DESC')
    .order('title', 'ASC')
    .all())
  const links_request = useAsyncData('content-links', () => queryCollection('links')
    .where('status', '=', 'published')
    .order('sort_order', 'ASC')
    .all())
  const [
    { data: products },
    { data: category_taxonomy },
    { data: channel_taxonomy },
    { data: tag_taxonomy },
    { data: guides },
    { data: links },
  ] = await Promise.all([
    products_request,
    category_taxonomy_request,
    channel_taxonomy_request,
    tag_taxonomy_request,
    guides_request,
    links_request,
  ])

  const all_products = computed(() => (products.value ?? []) as Product[])
  const runtime_taxonomies = computed<TaxonomyDefinitions | undefined>(() => {
    const categories = category_taxonomy.value?.items as CategoryDefinition[] | undefined
    const channels = channel_taxonomy.value?.items as ChannelDefinition[] | undefined
    const tags = tag_taxonomy.value?.items as TagDefinition[] | undefined

    if (categories === undefined || channels === undefined || tags === undefined) {
      return undefined
    }

    return { categories, channels, tags }
  })
  const runtime_guides = computed<Guide[] | undefined>(() => guides.value as Guide[] | undefined)
  const runtime_links = computed<LinkDefinition[] | undefined>(() => links.value as LinkDefinition[] | undefined)

  return {
    all_products,
    runtime_taxonomies,
    runtime_guides,
    runtime_links,
  }
}
