<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { TabsList, type TabsListProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
    const { class: _, ...delegated } = props

    return delegated
})
</script>

<template>
    <TabsList v-bind="delegatedProps" :class="cn(
        'inline-flex items-center justify-start border-b border-border bg-transparent text-ink-2',
        props.class,
    )">
        <slot />
    </TabsList>
</template>
