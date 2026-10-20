<script setup lang="ts">
import { computed } from 'vue'
import { getLevelInfo } from '@/types/problem'

const props = defineProps<{ level: number }>()

const info = computed(() => getLevelInfo(props.level))
const filled = computed(() => (props.level === 1 || props.level === 2 || props.level === 3 ? props.level : 0))
const toneByLevel: Record<number, string> = { 1: 'text-success-ink', 2: 'text-warning-ink', 3: 'text-destructive-ink' }
const tone = computed(() => toneByLevel[filled.value] ?? 'text-muted-foreground')
const heights = ['h-[5px]', 'h-2', 'h-[11px]']
</script>

<template>
  <span :class="['inline-flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap', tone]">
    <span class="inline-flex h-[11px] items-end gap-0.5" aria-hidden="true">
      <i
        v-for="n in 3"
        :key="n"
        :data-bar="n <= filled ? 'filled' : 'empty'"
        :class="['block w-[3px] rounded-[1px]', heights[n - 1], n <= filled ? 'bg-current' : 'bg-current/25']"
      />
    </span>
    {{ info.text }}
  </span>
</template>
