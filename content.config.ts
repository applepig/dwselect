import { defineCollection, defineContentConfig } from '@nuxt/content'

import { product_schema } from './app/utils/product-schema'

export default defineContentConfig({
  collections: {
    products: defineCollection({
      type: 'data',
      source: 'products/*.json',
      schema: product_schema,
    }),
  },
})
