<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import {
    SplitterResizeHandle,
    type SplitterResizeHandleProps,
    useForwardProps,
} from 'reka-ui'
import { GripVertical } from 'lucide-vue-next'
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
            'relative flex w-px items-center justify-center bg-border transition-colors',
            'after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2',
            'hover:bg-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            props.class,
        )">
        <div v-if="withHandle"
            class="z-10 flex h-6 w-3 items-center justify-center rounded-sm border border-border bg-background">
            <GripVertical class="h-2.5 w-2.5 text-muted-foreground" />
        </div>
    </SplitterResizeHandle>
</template>
