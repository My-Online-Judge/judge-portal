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
  <div class="flex min-w-0 flex-col gap-1.5 p-4" :aria-busy="loading ? 'true' : undefined">
    <span class="flex items-center gap-[7px] text-[12.5px] font-medium text-muted-foreground">
      <component :is="icon" v-if="icon" class="size-[15px]" aria-hidden="true" />
      {{ label }}
    </span>
    <template v-if="loading">
      <span class="sk my-px h-[30px] w-16" />
      <span class="sk mt-1 h-2.5 w-[120px]" />
    </template>
    <template v-else-if="error">
      <span class="text-[15px] leading-[34px] text-muted-foreground">Unavailable</span>
      <span class="flex flex-wrap items-center gap-1.5 text-xs text-destructive-ink">
        <CircleAlert class="size-[13px]" aria-hidden="true" />
        Could not load.
        <button type="button" class="text-link hover:underline" @click="$emit('retry')">Retry</button>
      </span>
    </template>
    <template v-else>
      <span class="font-mono text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] tabular-nums">
        {{ value }}<small v-if="suffix" class="ml-1 text-[15px] font-medium tracking-[-0.01em] text-muted-foreground">{{ suffix }}</small>
      </span>
      <span v-if="context" class="text-xs text-muted-foreground">{{ context }}</span>
    </template>
  </div>
</template>
