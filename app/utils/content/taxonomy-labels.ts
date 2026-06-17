import type { CategoryDefinition, ChannelDefinition, Product, ProductOffer, TagDefinition } from '../product-schema.ts'

export type TaxonomyLabelResolver = {
  getCategoryLabel: (category_id: Product['category_id']) => string
  getChannelLabel: (channel_id: ProductOffer['channel_id']) => string
  getProductTagLabel: (tag_id: string) => string
  getContentTagLabel: (tag_id: string) => string
}

export type TaxonomyLabelSource = {
  categories: CategoryDefinition[]
  channels: ChannelDefinition[]
  tags: TagDefinition[]
  brands: TagDefinition[]
}

export function createTaxonomyLabelResolver(taxonomies: TaxonomyLabelSource): TaxonomyLabelResolver {
  const category_labels = new Map(taxonomies.categories.map((category) => [category.id, category.label]))
  const channel_labels = new Map(taxonomies.channels.map((channel) => [channel.id, channel.label]))
  const tag_labels = new Map(taxonomies.tags.map((tag) => [tag.id, tag.label]))
  const brand_labels = new Map(taxonomies.brands.map((brand) => [brand.id, brand.label]))

  return {
    getCategoryLabel: (category_id) => category_labels.get(category_id) ?? category_id,
    getChannelLabel: (channel_id) => channel_labels.get(channel_id) ?? channel_id,
    getProductTagLabel: (tag_id) => tag_labels.get(tag_id) ?? brand_labels.get(tag_id) ?? tag_id,
    getContentTagLabel: (tag_id) => tag_labels.get(tag_id) ?? tag_id,
  }
}
