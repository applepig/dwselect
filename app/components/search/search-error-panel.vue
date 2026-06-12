<template>
  <div
    class="search-error-panel"
    role="alert"
  >
    <p class="empty-title">
      搜尋索引暫時載入失敗
    </p>
    <p class="search-helper-text">
      請重新嘗試，或清空搜尋回到搜尋紀錄。
    </p>
    <div class="search-action-row">
      <button
        type="button"
        class="search-action-button"
        @click="$emit('retry')"
      >
        重新嘗試
      </button>
      <button
        type="button"
        class="search-action-button"
        @click="$emit('clear')"
      >
        清空搜尋
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  retry: []
  clear: []
}>()
</script>
