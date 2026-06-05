import { describe, expect, it } from 'vitest'

import nuxt_config from '../nuxt.config'
import { getPublishedProductsQuery } from '../app/utils/get-published-products-query'

describe('Nuxt SSG baseline', () => {
  it('should enable Nuxt Content and static generation baseline', () => {
    expect(nuxt_config.modules).toContain('@nuxt/content')
    expect(nuxt_config.nitro?.preset).toBe('static')
  })

  it('should expose a published products query helper skeleton', () => {
    expect(getPublishedProductsQuery()).toEqual({
      collection: 'products',
      where: {
        status: 'published',
      },
      sort: [
        { category: 'ASC' },
        { published_at: 'DESC' },
        { name: 'ASC' },
      ],
    })
  })
})
