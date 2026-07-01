<template>
  <div class="compact-page">
    <CategoryChipBar />

    <TaxonomyPage
      v-if="page_data"
      :data="page_data"
    />
  </div>
</template>

<script setup lang="ts">
const { page_data } = await useTaxonomyDetailPage('category')
</script>
