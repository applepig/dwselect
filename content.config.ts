import { defineCollection, defineContentConfig } from '@nuxt/content'

import {
  category_taxonomy_schema,
  channel_taxonomy_schema,
  link_taxonomy_schema,
  product_schema,
} from './app/utils/product-schema'

export default defineContentConfig({
  collections: {
    products: defineCollection({
      type: 'data',
      source: 'products/*.json',
      schema: product_schema,
    }),
    categories: defineCollection({
      type: 'data',
      source: 'taxonomies/categories.json',
      schema: category_taxonomy_schema,
    }),
    channels: defineCollection({
      type: 'data',
      source: 'taxonomies/channels.json',
      schema: channel_taxonomy_schema,
    }),
    links: defineCollection({
      type: 'data',
      source: 'taxonomies/links.json',
      schema: link_taxonomy_schema,
    }),
  },
})
