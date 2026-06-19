import { readPublicContentSource } from '../../scripts/content-reader.ts'
import { buildSearchIndexPayload } from '../../app/utils/search/search-index.ts'

// Search index route：維持既有 /search-index.json URL，client MiniSearch 仍 lazy fetch 同一路徑。
// dev 即時反映 content 變更；generate 時 prerender 成 static file。
export default defineEventHandler(async (event) => {
  const source = await readPublicContentSource()
  const payload = buildSearchIndexPayload(
    { products: source.products, guides: source.guides, links: source.links },
    {
      categories: source.taxonomies.categories,
      channels: source.taxonomies.channels,
      tags: source.taxonomies.tags,
      brands: source.taxonomies.brands,
    },
  )

  setHeader(event, 'content-type', 'application/json; charset=utf-8')

  return payload
})
