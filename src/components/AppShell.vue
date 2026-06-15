<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <div class="shell-main">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 256px 1fr;
  min-height: 100vh;
  background: #f4f3f9;
}
.shell-main {
  min-width: 0;
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .shell :deep(.sidebar) {
    display: none;
  }
}
</style>
