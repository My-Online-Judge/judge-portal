<template>
    <!-- Not a live region: screen readers read it when asked, not on every tick. -->
    <span :class="cn('text-base font-medium tabular-nums', props.class)" :title="formatDateTime(target)">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed, watch, type HTMLAttributes } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { cn } from '@/lib/utils'
import { formatCountdown } from '@/lib/contestTime'
import { formatDateTime } from '@/utils/dateTimeUtils'

const props = defineProps<{
    /** The instant counted down to (ISO). */
    target: string
    /** serverOffsetMs of the response the target came from. */
    offsetMs: number
    /** Merged over the body face at 16 px medium, so a caller can ask for text-sm. */
    class?: HTMLAttributes['class']
}>()
// Once per target, when it is reached: the page reads the contest again to learn its new phase.
const emit = defineEmits<{ (e: 'elapsed'): void }>()

// A tick a second: useNow's own default is every animation frame.
const now = useNow({ scheduler: (tick) => useIntervalFn(tick, 1000) })
const remaining = computed(() => Date.parse(props.target) - (now.value.getTime() + props.offsetMs))
const text = computed(() => formatCountdown(remaining.value))

watch(
    [() => props.target, () => remaining.value <= 0],
    ([target, reached], old) => {
        if (reached && (!old || old[0] !== target || !old[1])) emit('elapsed')
    },
    { immediate: true },
)
</script>
