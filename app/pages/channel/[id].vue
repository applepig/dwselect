<template>
  <TaxonomyPage
    v-if="page_data"
    :data="page_data"
  />
</template>

<script setup lang="ts">
const { page_data } = await useTaxonomyDetailPage('channel')
</script>
