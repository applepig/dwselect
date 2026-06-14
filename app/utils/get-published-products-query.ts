export function getPublishedProductsQuery() {
  return {
    collection: 'products',
    where: {
      status: 'published',
    },
    sort: [
      { category_id: 'ASC' },
      { published_at: 'DESC' },
      { name: 'ASC' },
    ],
  }
}
