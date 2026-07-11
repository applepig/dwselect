import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

type RouteStub = {
  path: string
  query: Record<string, string | string[] | undefined>
}

let runMiddleware: (to: RouteStub) => Promise<unknown>
let redirectLegacyCategory: (to: RouteStub, is_server: boolean) => Promise<unknown>

beforeAll(async () => {
  vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
  const mod = await import('../app/middleware/legacy-category-redirect.global')
  runMiddleware = mod.default as typeof runMiddleware
  redirectLegacyCategory = mod.redirectLegacyCategory as typeof redirectLegacyCategory
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function setCatalogCategories(category_ids: string[]) {
  vi.stubGlobal('useCatalogData', async () => ({
    category_ids: { value: new Set(category_ids) },
  }))
}

describe('legacy category redirect middleware', () => {
  it('redirects a selectable legacy category query during the initial home route navigation', async () => {
    const navigate_to = vi.fn()
    setCatalogCategories(['computer-3c'])
    vi.stubGlobal('navigateTo', navigate_to)

    await runMiddleware({ path: '/', query: { category: 'computer-3c' } })

    expect(navigate_to).toHaveBeenCalledWith('/category/computer-3c', { replace: true })
  })

  it('keeps an invalid legacy category query on the home route', async () => {
    const navigate_to = vi.fn()
    setCatalogCategories(['computer-3c'])
    vi.stubGlobal('navigateTo', navigate_to)

    await runMiddleware({ path: '/', query: { category: 'not-a-real-category' } })

    expect(navigate_to).not.toHaveBeenCalled()
  })

  it.each([
    ['an empty category id', ''],
    ['the all sentinel', 'all'],
    ['multiple category values', ['computer-3c', 'network']],
  ])('does not redirect %s', async (_case_name, category) => {
    const navigate_to = vi.fn()
    setCatalogCategories(['computer-3c', 'network'])
    vi.stubGlobal('navigateTo', navigate_to)

    await runMiddleware({ path: '/', query: { category } })

    expect(navigate_to).not.toHaveBeenCalled()
  })

  it('does not read catalog data or redirect during server rendering', async () => {
    const use_catalog_data = vi.fn()
    const navigate_to = vi.fn()
    vi.stubGlobal('useCatalogData', use_catalog_data)
    vi.stubGlobal('navigateTo', navigate_to)

    await redirectLegacyCategory({ path: '/', query: { category: 'computer-3c' } }, true)

    expect(use_catalog_data).not.toHaveBeenCalled()
    expect(navigate_to).not.toHaveBeenCalled()
  })

  it('does not load category data for routes other than home', async () => {
    const use_catalog_data = vi.fn()
    vi.stubGlobal('useCatalogData', use_catalog_data)

    await runMiddleware({ path: '/guide', query: { category: 'computer-3c' } })

    expect(use_catalog_data).not.toHaveBeenCalled()
  })
})
