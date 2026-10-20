<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { AvatarRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
    class?: HTMLAttributes['class']
    size?: 'sm' | 'base' | 'lg'
}>(), {
    size: 'base',
})

// sm is 24px with a 6px radius; the rest are 8px.
const sizes = {
    sm: 'size-6 rounded-md',
    base: 'h-10 w-10 rounded-lg',
    lg: 'size-12 rounded-lg',
}
</script>

<template>
    <AvatarRoot :class="cn(
        'relative flex shrink-0 overflow-hidden',
        sizes[props.size],
        props.class,
    )">
        <slot />
    </AvatarRoot>
</template>
