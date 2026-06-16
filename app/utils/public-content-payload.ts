import type {
  CategoryDefinition,
  ChannelDefinition,
  Guide,
  LinkDefinition,
  Product,
  TagDefinition,
} from './product-schema'

export type PublicContentPayload = {
  version: 1
  site: {
    name: 'DW嚴選'
    url: 'https://dwselect.applepig.net/'
  }
  products: Product[]
  guides: Guide[]
  links: LinkDefinition[]
  taxonomies: {
    categories: CategoryDefinition[]
    channels: ChannelDefinition[]
    tags: TagDefinition[]
    brands: TagDefinition[]
  }
}
