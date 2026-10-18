<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import {
    SplitterGroup,
    type SplitterGroupProps,
    type SplitterGroupEmits,
    useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<SplitterGroupProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<SplitterGroupEmits>()

const delegated = computed(() => {
    const { class: _, ...rest } = props
    return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
</script>

<template>
    <SplitterGroup v-bind="forwarded"
        :class="cn('flex h-full w-full data-[panel-group-direction=vertical]:flex-col', props.class)">
        <slot />
    </SplitterGroup>
</template>
