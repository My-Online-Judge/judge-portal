<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn(
        'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border py-6 shadow-[0_1px_2px_rgba(30,58,138,0.05),0_6px_16px_-8px_rgba(30,58,138,0.06)] transition-shadow duration-200',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
