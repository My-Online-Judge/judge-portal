<script setup lang="ts">
import {
    SplitterPanel,
    type SplitterPanelProps,
    type SplitterPanelEmits,
    useForwardPropsEmits,
} from 'reka-ui'

const props = defineProps<SplitterPanelProps>()
const emits = defineEmits<SplitterPanelEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
    <SplitterPanel v-bind="forwarded">
        <slot />
    </SplitterPanel>
</template>
