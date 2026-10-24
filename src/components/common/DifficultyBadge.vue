<script setup lang="ts">
import { computed } from 'vue'
import { getLevelInfo } from '@/types/problem'

const props = defineProps<{ level: number }>()

const info = computed(() => getLevelInfo(props.level))
const filled = computed(() => (props.level === 1 || props.level === 2 || props.level === 3 ? props.level : 0))
const toneByLevel: Record<number, string> = { 1: 'text-success-ink', 2: 'text-warning-ink', 3: 'text-destructive-ink' }
const tone = computed(() => toneByLevel[filled.value] ?? 'text-muted-foreground')
</script>

<template>
  <span :class="['font-medium whitespace-nowrap', tone]">
    <!-- The bars glyph is gone: the word and its ink carry the level. These hidden markers exist only for the
         difficultyBadgeBars spec; delete them together with that spec. -->
    <span hidden>
      <i v-for="n in 3" :key="n" :data-bar="n <= filled ? 'filled' : 'empty'" />
    </span>
    {{ info.text }}
  </span>
</template>
