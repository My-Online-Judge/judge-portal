<script setup lang="ts">
// Stands in for the lazily loaded code editor: a skeleton while its chunk loads, a short notice if it cannot.
// As defineAsyncComponent's errorComponent it receives the load error; as loadingComponent it receives nothing.
defineProps<{ error?: unknown; height?: string }>()
</script>

<template>
  <div
    v-if="error === undefined"
    data-test="editor-loading"
    class="sk w-full"
    :style="{ height: height ?? '320px' }"
    role="status"
    aria-label="Loading the code editor"
  />
  <div
    v-else
    data-test="editor-failed"
    role="alert"
    class="flex w-full items-center justify-center px-4 text-sm text-destructive-ink"
    :style="{ height: height ?? '320px' }"
  >
    Could not load the editor. Check your connection and reopen this window.
  </div>
</template>
