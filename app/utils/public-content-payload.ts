import type {
  CategoryDefinition,
  ChannelDefinition,
  TagDefinition,
} from './product-schema'
import type {
  CategoryChipView,
  ProductCardView,
} from './public-content-view-types'
import type { CompactResourceRow, CompactSearchTagGroups } from './published-products/types'

export type PublicTaxonomies = {
  categories: CategoryDefinition[]
  channels: ChannelDefinition[]
  tags: TagDefinition[]
  brands: TagDefinition[]
}

export type PublicContentPayload = {
  version: 1
  site: {
    name: 'DW嚴選'
    url: 'https://dwselect.applepig.net/'
  }
  products: {
    cards: ProductCardView[]
  }
  guides: {
    rows: CompactResourceRow[]
  }
  links: CompactResourceRow[]
  navigation: {
    category_chips: CategoryChipView[]
    desktop_category_items: CategoryChipView[]
    popular_search_tags: CompactSearchTagGroups
    counts: {
      products: number
    }
  }
  taxonomies: PublicTaxonomies
}
