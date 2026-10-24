<script setup lang="ts">
import type { Component } from 'vue'
import { CircleAlert } from 'lucide-vue-next'

defineProps<{
  label: string
  icon?: Component
  value?: string | number
  suffix?: string
  context?: string
  loading?: boolean
  error?: boolean
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1 p-4" :aria-busy="loading ? 'true' : undefined">
    <span class="flex items-center gap-2 text-sm text-muted-foreground">
      <component :is="icon" v-if="icon" class="size-4" aria-hidden="true" />
      {{ label }}
    </span>
    <template v-if="loading">
      <span class="sk h-7.5 w-16" />
      <span class="sk mt-1 h-3 w-28" />
    </template>
    <template v-else-if="error">
      <span class="flex h-7.5 items-center text-base text-muted-foreground">Unavailable</span>
      <span role="alert" class="flex flex-wrap items-center gap-1.5 text-sm text-destructive-ink">
        <CircleAlert class="size-3.5" aria-hidden="true" />
        Could not load.
        <button type="button" :aria-label="`Retry loading ${label}`" class="text-link hover:underline" @click="$emit('retry')">Retry</button>
      </span>
    </template>
    <template v-else>
      <span class="text-xl font-semibold tabular-nums">
        {{ value }}<small v-if="suffix" class="ml-1 text-sm font-medium text-muted-foreground">{{ suffix }}</small>
      </span>
      <span v-if="context" class="text-sm text-muted-foreground">{{ context }}</span>
    </template>
  </div>
</template>
