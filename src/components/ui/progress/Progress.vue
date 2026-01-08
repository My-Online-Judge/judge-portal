<script setup lang="ts">
import type { ProgressRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  ProgressIndicator,
  ProgressRoot,
} from "reka-ui"
import { cn } from "@/lib/utils"
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    max?: number
    class?: HTMLAttributes["class"] // eslint-disable-line vue/no-reserved-component-names
    indicatorClass?: HTMLAttributes["class"]
  }>(),
  {
    modelValue: 0,
    max: 100,
  },
)

const delegatedProps = computed(() => {
  const { class: _, indicatorClass: __, ...delegated } = props

  return delegated
})
</script>

<template>
  <ProgressRoot v-bind="delegatedProps" :class="cn(
    'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
    props.class,
  )
    ">
    <ProgressIndicator :class="cn('h-full w-full flex-1 bg-primary transition-all', props.indicatorClass)"
      :style="`transform: translateX(-${100 - (props.modelValue ?? 0)}%);`" />
  </ProgressRoot>
</template>
