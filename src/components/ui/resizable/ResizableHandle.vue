<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import {
    SplitterResizeHandle,
    type SplitterResizeHandleProps,
    useForwardProps,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
    defineProps<SplitterResizeHandleProps & { class?: HTMLAttributes['class']; withHandle?: boolean }>(),
    { withHandle: false },
)

const delegated = computed(() => {
    const { class: _, withHandle: _withHandle, ...rest } = props
    return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
    <SplitterResizeHandle v-bind="forwarded"
        :class="cn(
            'group/handle relative w-2 shrink-0 cursor-col-resize bg-background outline-none',
            'before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border',
            'after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-primary after:opacity-0 after:transition-opacity',
            'hover:after:opacity-100 data-[state=drag]:after:opacity-100 data-[state=hover]:after:opacity-100',
            'focus-visible:rounded-[4px] focus-visible:shadow-[inset_0_0_0_2px_var(--ring)] focus-visible:after:bg-ring focus-visible:after:opacity-100',
            'motion-reduce:after:transition-none',
            props.class,
        )">
        <!-- 8 px hit area around a 1 px hairline. Hover, drag (reka's data-state) and keyboard focus lay a 2 px
             primary line over it and show the grip; only opacity moves. reka keeps the arrow, Home and End keys. -->
        <span v-if="withHandle" aria-hidden="true"
            class="absolute top-1/2 left-1/2 z-10 h-7 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-input bg-card opacity-0 transition-opacity group-hover/handle:opacity-100 group-focus-visible/handle:opacity-100 group-data-[state=drag]/handle:opacity-100 group-data-[state=hover]/handle:opacity-100 motion-reduce:transition-none" />
    </SplitterResizeHandle>
</template>
