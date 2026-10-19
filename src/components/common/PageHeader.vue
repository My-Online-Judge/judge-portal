<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  title: string
  description?: string
  breadcrumbs?: { label: string; to?: RouteLocationRaw; mono?: boolean }[]
}>()
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <nav v-if="breadcrumbs?.length" aria-label="Breadcrumb">
      <ol class="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted-foreground">
        <li v-for="(crumb, i) in breadcrumbs" :key="i" class="flex items-center gap-1.5">
          <ChevronRight v-if="i > 0" class="size-[13px] opacity-60" aria-hidden="true" />
          <span
            v-if="i === breadcrumbs.length - 1"
            aria-current="page"
            :class="['font-medium text-foreground', crumb.mono && 'font-mono']"
          >{{ crumb.label }}</span>
          <RouterLink
            v-else-if="crumb.to"
            :to="crumb.to"
            :class="['hover:text-foreground hover:underline', crumb.mono && 'font-mono']"
          >{{ crumb.label }}</RouterLink>
          <span v-else :class="crumb.mono && 'font-mono'">{{ crumb.label }}</span>
        </li>
      </ol>
    </nav>
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div class="min-w-0">
        <h1 class="text-2xl leading-tight font-bold tracking-[-0.024em]">{{ title }}</h1>
        <p v-if="description" class="mt-1 max-w-[64ch] text-[13.5px] text-muted-foreground">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
