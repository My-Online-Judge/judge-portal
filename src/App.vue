<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <Header />

    <main class="mx-auto w-full max-w-[84rem] flex-1 px-4 py-8 md:px-6 lg:px-8">
      <RouterView />
    </main>

    <footer class="border-t border-border py-8 text-center">
      <p class="text-sm text-muted-foreground">MyOJ — practice, submit, get judged in real time.</p>
      <p class="mt-1 text-xs text-muted-foreground/60">© {{ new Date().getFullYear() }} MyOJ</p>
    </footer>
  </div>
  <Toaster />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Header from '@/components/layout/Header.vue'
import Toaster from '@/components/ui/toast/Toaster.vue'
</script>
