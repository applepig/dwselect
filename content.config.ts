import { defineCollection, defineContentConfig } from '@nuxt/content'

import {
  category_taxonomy_schema,
  brand_taxonomy_schema,
  channel_taxonomy_schema,
  guide_schema,
  link_schema,
  product_schema,
  tag_taxonomy_schema,
} from './app/utils/product-schema'

export default defineContentConfig({
  collections: {
    products: defineCollection({
      type: 'data',
      source: 'products/*.json',
      schema: product_schema,
    }),
    guides: defineCollection({
      type: 'data',
      source: 'guides/*.json',
      schema: guide_schema,
    }),
    links: defineCollection({
      type: 'data',
      source: 'links/*.json',
      schema: link_schema,
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
    tags: defineCollection({
      type: 'data',
      source: 'taxonomies/tags.json',
      schema: tag_taxonomy_schema,
    }),
    brands: defineCollection({
      type: 'data',
      source: 'taxonomies/brands.json',
      schema: brand_taxonomy_schema,
    }),
  },
})
