<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { TabsTrigger, type TabsTriggerProps, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
    const { class: _, ...delegated } = props

    return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
    <TabsTrigger v-bind="forwardedProps" :class="cn(
        'relative inline-flex h-11 items-center justify-center gap-[7px] whitespace-nowrap px-3 text-sm font-medium text-ink-2 transition-colors duration-[120ms] motion-reduce:transition-none hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 data-[state=active]:text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary [&_svg]:size-[15px]',
        props.class,
    )">
        <slot />
    </TabsTrigger>
</template>
