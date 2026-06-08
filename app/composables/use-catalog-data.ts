import type { CategoryDefinition, ChannelDefinition, LinkDefinition, Product } from '../utils/product-schema'
import type { TaxonomyDefinitions } from '../utils/published-products'

export async function useCatalogData() {
  const products_request = useAsyncData('published-products', () => queryCollection('products')
    .where('status', '=', 'published')
    .order('category_id', 'ASC')
    .order('published_at', 'DESC')
    .order('name', 'ASC')
    .all())
  const category_taxonomy_request = useAsyncData('taxonomy-categories', () => queryCollection('categories').first())
  const channel_taxonomy_request = useAsyncData('taxonomy-channels', () => queryCollection('channels').first())
  const link_taxonomy_request = useAsyncData('taxonomy-links', () => queryCollection('links').first())
  const [
    { data: products },
    { data: category_taxonomy },
    { data: channel_taxonomy },
    { data: link_taxonomy },
  ] = await Promise.all([
    products_request,
    category_taxonomy_request,
    channel_taxonomy_request,
    link_taxonomy_request,
  ])

  const all_products = computed(() => (products.value ?? []) as Product[])
  const runtime_taxonomies = computed<TaxonomyDefinitions | undefined>(() => {
    const categories = category_taxonomy.value?.items as CategoryDefinition[] | undefined
    const channels = channel_taxonomy.value?.items as ChannelDefinition[] | undefined

    if (categories === undefined || channels === undefined) {
      return undefined
    }

    return { categories, channels }
  })
  const runtime_links = computed<LinkDefinition[] | undefined>(() => link_taxonomy.value?.items as LinkDefinition[] | undefined)

  return {
    all_products,
    runtime_taxonomies,
    runtime_links,
  }
}
