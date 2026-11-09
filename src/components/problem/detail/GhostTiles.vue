<template>
    <div :class="['tiles', judged.size ? '' : 'ghost-tiles']" role="img" :aria-label="label">
        <span v-for="t in slots" :key="t.name" :class="tileClass(t)" :style="revealStyle(t)" aria-hidden="true">
            <span class="tn">{{ t.name }}</span>
        </span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { verdictMeta } from '@/lib/verdict'

/**
 * The ladder before the verdict: one tile per expected test. Tiles the judge has already reported (`judged`, by test
 * name) take their verdict's tint as they arrive; the rest wait (dashed) or run (pulsing). Tests are named by their
 * 1-based position in the bundle, so a numeric name fills its own slot; any other name is appended.
 */
const props = withDefaults(
    defineProps<{ count?: number; state: 'pending' | 'running'; judged?: Map<string, number> }>(),
    { count: 12, judged: () => new Map<string, number>() },
)

interface Slot {
    name: string
    result: number | null
    order: number
}

const NUMERIC = /^\d+$/

const slots = computed<Slot[]>(() => {
    const n = Math.max(props.count, 1)
    const out: Slot[] = []
    for (let i = 1; i <= n; i++) out.push({ name: String(i), result: null, order: 0 })
    let arrival = 0
    for (const [name, result] of props.judged) {
        arrival += 1
        const at = NUMERIC.test(name) ? Number(name) : NaN
        if (at >= 1 && at <= n) out[at - 1] = { name, result, order: arrival }
        else out.push({ name, result, order: arrival })
    }
    return out
})

const label = computed(() => {
    if (props.judged.size) return `${props.judged.size} of ${slots.value.length} tests judged`
    return props.state === 'running' ? 'Judging tests' : 'Waiting in queue'
})

const motionOk = useMediaQuery('(prefers-reduced-motion: no-preference)')
const tileClass = (t: Slot) => {
    if (t.result === null) return ['tile', props.state === 'running' ? 'running' : 'v-pending']
    return ['tile', 'live', `v-${verdictMeta(t.result).tone}`, t.result === 0 ? 'pass' : '', motionOk.value ? 'reveal' : '']
}
// The newest tile reveals; the ones already shown keep still (a key change would replay them all).
const revealStyle = (t: Slot) => (t.result !== null && motionOk.value ? { animationDelay: '0ms' } : undefined)
</script>
