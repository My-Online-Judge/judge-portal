<script setup lang="ts">
import {
    SplitterPanel,
    type SplitterPanelProps,
    type SplitterPanelEmits,
    useForwardExpose,
    useForwardPropsEmits,
} from 'reka-ui'

const props = defineProps<SplitterPanelProps>()
const emits = defineEmits<SplitterPanelEmits>()
const forwarded = useForwardPropsEmits(props, emits)
// A template ref on this wrapper reaches reka's panel API (resize, getSize, collapse, expand).
const { forwardRef } = useForwardExpose()
</script>

<template>
    <SplitterPanel :ref="forwardRef" v-bind="forwarded">
        <slot />
    </SplitterPanel>
</template>
