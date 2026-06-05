import type { Product } from './product-schema'

export type PublishedProductCard = {
  id: string
  category: string
  image: string
  name: string
  price: string
  purchase_link: string
}

export type GroupedPublishedProducts = {
  category: string
  products: PublishedProductCard[]
}

export function getPublishedProducts(products: Product[]): PublishedProductCard[] {
  return products
    .filter((product) => product.status === 'published')
    .toSorted(compareProducts)
    .map(mapProductToCard)
}

export function getGroupedPublishedProducts(products: Product[]): GroupedPublishedProducts[] {
  const grouped_products = new Map<string, PublishedProductCard[]>()

  for (const product of getPublishedProducts(products)) {
    const category_products = grouped_products.get(product.category) ?? []
    category_products.push(product)
    grouped_products.set(product.category, category_products)
  }

  return Array.from(grouped_products, ([category, category_products]) => ({
    category,
    products: category_products,
  }))
}

function compareProducts(left_product: Product, right_product: Product) {
  const category_order = left_product.category.localeCompare(right_product.category)

  if (category_order !== 0) {
    return category_order
  }

  const published_at_order = compareNullableTimestampDesc(left_product.published_at, right_product.published_at)

  if (published_at_order !== 0) {
    return published_at_order
  }

  return left_product.name.localeCompare(right_product.name)
}

function compareNullableTimestampDesc(left_value: string | null, right_value: string | null) {
  if (left_value === right_value) {
    return 0
  }

  if (left_value === null) {
    return 1
  }

  if (right_value === null) {
    return -1
  }

  return right_value.localeCompare(left_value)
}

function mapProductToCard(product: Product): PublishedProductCard {
  return {
    id: product.id,
    category: product.category,
    image: product.image_url,
    name: product.name,
    price: product.price_text,
    purchase_link: product.purchase_url,
  }
}
