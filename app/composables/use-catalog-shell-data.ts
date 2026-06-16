import type { PublicContentPayload } from '../utils/public-content-payload'
import { fetchPublicContentPayload } from '../utils/fetch-public-content-payload'
import { getCatalogShellSummary } from '../utils/published-products/catalog-shell-summary'

export async function useCatalogShellData() {
  const { data: catalog_shell_data } = await useAsyncData(
    'catalog-shell-summary',
    fetchPublicContentPayload,
    {
      transform: (content_payload) => getCatalogShellSummary(content_payload as PublicContentPayload),
    },
  )

  return catalog_shell_data
}
