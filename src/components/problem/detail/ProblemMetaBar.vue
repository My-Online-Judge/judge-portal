<template>
    <ProblemStatsDialog :problem="problem">
        <button type="button" aria-haspopup="dialog"
            class="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 self-start rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground tabular outline-none hover:border-input hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <DifficultyBadge :level="problem.hardnessLevel" class="font-sans" />
            <template v-for="item in items" :key="item.key">
                <!-- The hairline reads as a comma to a screen reader. -->
                <span class="h-3 w-px bg-border"><span class="sr-only">, </span></span>
                <span>
                    <span v-if="item.label" class="text-muted-foreground">{{ `${item.label} ` }}</span>
                    <span :class="{ 'text-muted-foreground': item.muted }">{{ item.value }}</span>
                </span>
            </template>
            <ChartPie class="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span class="sr-only">. Open submission statistics</span>
        </button>
    </ProblemStatsDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChartPie } from 'lucide-vue-next'
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import type { Problem } from '@/types/problem'
import ProblemStatsDialog from './ProblemStatsDialog.vue'

const props = defineProps<{ problem: Problem }>()

// The time limit is stored in milliseconds; it reads in seconds ("2 s", "1.5 s").
const seconds = (ms: number) => `${Number(((ms || 0) / 1000).toFixed(2))} s`

const items = computed(() => {
    const total = props.problem.totalSubmission || 0
    const accepted = props.problem.acceptedSubmission || 0
    return [
        { key: 'time', label: 'Time', value: seconds(props.problem.timeLimit) },
        { key: 'memory', label: 'Memory', value: `${props.problem.memoryLimit} MB` },
        { key: 'ac', label: 'AC', value: total ? `${((accepted / total) * 100).toFixed(1)}%` : '-' },
        { key: 'total', label: '', value: `${total} ${total === 1 ? 'submission' : 'submissions'}`, muted: true },
    ]
})
</script>
