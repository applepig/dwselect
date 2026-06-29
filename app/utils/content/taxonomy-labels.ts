import type { CategoryDefinition, ChannelDefinition, Product, ProductOffer, TagDefinition } from '../product-schema.ts'

export type TaxonomyLabelResolver = {
  getCategoryLabel: (category_id: Product['category_id']) => string
  getChannelLabel: (channel_id: ProductOffer['channel_id']) => string
  getProductTagLabel: (tag_id: string) => string
  getContentTagLabel: (tag_id: string) => string
  getContentTagDescription: (tag_id: string) => string | null
  getTaxonomyTagLabel: (tag_id: string) => string
  getTaxonomyTagDescription: (tag_id: string) => string | null
  // brand 與 tag 共用 tag_ids namespace（ADR-8）：給定一個 tag_ids 成員，判定它是否為 brand id，
  // 讓 detail mapper 把 tag_ids 切成 tags（→/tag）與 brands（→/brand）兩組互斥清單（AC24b）。
  isBrandId: (tag_id: string) => boolean
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
  const tag_descriptions = new Map(taxonomies.tags.map((tag) => [tag.id, tag.description]))
  const brand_descriptions = new Map(taxonomies.brands.map((brand) => [brand.id, brand.description]))

  // 空字串簡介視同無簡介，回 null 讓頁面省略簡介段（與 category 無 description 一致）。
  const normalizeDescription = (description: string | undefined): string | null => {
    const trimmed = description?.trim() ?? ''

    return trimmed === '' ? null : trimmed
  }

  return {
    getCategoryLabel: (category_id) => category_labels.get(category_id) ?? category_id,
    getChannelLabel: (channel_id) => channel_labels.get(channel_id) ?? channel_id,
    getProductTagLabel: (tag_id) => tag_labels.get(tag_id) ?? brand_labels.get(tag_id) ?? tag_id,
    getContentTagLabel: (tag_id) => tag_labels.get(tag_id) ?? tag_id,
    getContentTagDescription: (tag_id) => normalizeDescription(tag_descriptions.get(tag_id)),
    // brand 與 tag 共用 tag_ids namespace（ADR-8）：taxonomy 頁的 /tag/{id} 可能是 brand id，
    // 故 tags→brands→id fallback，讓品牌頁顯示 brand label/description 而非裸 id。
    getTaxonomyTagLabel: (tag_id) => tag_labels.get(tag_id) ?? brand_labels.get(tag_id) ?? tag_id,
    getTaxonomyTagDescription: (tag_id) => normalizeDescription(tag_descriptions.get(tag_id) ?? brand_descriptions.get(tag_id)),
    isBrandId: (tag_id) => brand_labels.has(tag_id),
  }
}
