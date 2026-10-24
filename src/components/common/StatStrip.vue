<script setup lang="ts">
// Four tiles sit 2 by 2 on phones; three stay in one row.
withDefaults(defineProps<{ cols?: 3 | 4 }>(), { cols: 4 })
</script>

<template>
  <div
    :class="[
      'grid overflow-hidden rounded-lg border border-border [&>*]:border-border',
      cols === 3
        ? 'grid-cols-3 [&>*:not(:first-child)]:border-l'
        : 'grid-cols-2 max-[760px]:[&>*:nth-child(even)]:border-l max-[760px]:[&>*:nth-child(n+3)]:border-t min-[761px]:grid-cols-4 min-[761px]:[&>*:not(:first-child)]:border-l',
    ]"
  >
    <slot />
  </div>
</template>
