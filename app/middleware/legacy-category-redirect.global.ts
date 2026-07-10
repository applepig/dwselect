import type { RouteLocationNormalized } from 'vue-router'

export async function redirectLegacyCategory(
  to: Pick<RouteLocationNormalized, 'path' | 'query'>,
  is_server: boolean,
) {
  if (is_server) {
    return
  }

  if (to.path !== '/') {
    return
  }

  const category_query = to.query.category
  if (typeof category_query !== 'string') {
    return
  }

  const { category_ids } = await useCatalogData()
  if (!category_ids.value.has(category_query)) {
    return
  }

  return navigateTo(`/category/${category_query}`, { replace: true })
}

export default defineNuxtRouteMiddleware(async (to) => {
  return await redirectLegacyCategory(to, import.meta.server)
})
