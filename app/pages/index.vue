<template>
  <main>
    <h1>DW嚴選</h1>
    <p>精選已上架商品</p>

    <section
      v-for="group in grouped_products"
      :key="group.category"
      class="product-section"
    >
      <h2>{{ group.category }}</h2>

      <ul class="product-grid">
        <li
          v-for="product in group.products"
          :key="product.id"
          class="product-card"
        >
          <img
            :src="product.image"
            :alt="product.name"
            loading="lazy"
          >
          <h3>{{ product.name }}</h3>
          <p>{{ product.price }}</p>
          <a :href="product.purchase_link">前往購買</a>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { getGroupedPublishedProducts } from '../utils/published-products'
import type { Product } from '../utils/product-schema'

const { data: products } = await useAsyncData('published-products', () => queryCollection('products')
  .where('status', '=', 'published')
  .order('category', 'ASC')
  .order('published_at', 'DESC')
  .order('name', 'ASC')
  .all())

const grouped_products = computed(() => getGroupedPublishedProducts((products.value ?? []) as Product[]))
</script>
