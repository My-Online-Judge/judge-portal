<script setup lang="ts">
import { computed } from 'vue'
import { getLevelInfo } from '@/types/problem'

const props = defineProps<{ level: number }>()

const info = computed(() => getLevelInfo(props.level))
const toneByLevel: Record<number, string> = { 1: 'text-success-ink', 2: 'text-warning-ink', 3: 'text-destructive-ink' }
const tone = computed(() => toneByLevel[props.level] ?? 'text-muted-foreground')
</script>

<template>
  <span :class="['font-medium whitespace-nowrap', tone]">{{ info.text }}</span>
</template>
