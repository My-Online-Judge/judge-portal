<template>
  <div class="min-h-screen bg-[#F8F9FA] font-sans text-slate-900 flex flex-col">
    <Header />

    <main class="w-full mx-auto flex-1 px-4 md:px-6 lg:px-8 py-4">
      <RouterView />
    </main>

    <!-- Simple Footer -->
    <footer class="py-6 text-center text-sm text-slate-500">
      &copy; {{ new Date().getFullYear() }} QDUOJ Clone. All rights reserved. Designed for demo
      purposes.
    </footer>
  </div>
  <Toaster />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Header from '@/components/layout/Header.vue'
import Toaster from '@/components/ui/toast/Toaster.vue'
</script>
