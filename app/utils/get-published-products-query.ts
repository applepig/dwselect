export function getPublishedProductsQuery() {
  return {
    collection: 'products',
    where: {
      status: 'published',
    },
    sort: [
      { category: 'ASC' },
      { published_at: 'DESC' },
      { name: 'ASC' },
    ],
  }
}
