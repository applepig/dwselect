import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProductsStore = defineStore('products', () => {
    const products = ref([])

    return { products }
})
