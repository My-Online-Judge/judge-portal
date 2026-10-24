<template>
    <div class="flex flex-wrap items-center gap-x-[22px] gap-y-1.5 text-[13px]">
        <dl class="contents">
            <div v-for="item in items" :key="item.key" class="flex items-baseline gap-1.5">
                <dt class="text-muted-foreground">{{ item.label }}</dt>
                <dd class="tabular font-semibold text-foreground">{{ item.value }}</dd>
            </div>
        </dl>
        <ProblemStatsDialog :problem="problem">
            <button type="button" aria-haspopup="dialog"
                class="-mx-1 inline-flex h-7 items-center gap-1.5 rounded-md px-1 font-medium text-link outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <ChartColumn class="size-3.5" aria-hidden="true" />
                Statistics
            </button>
        </ProblemStatsDialog>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChartColumn } from 'lucide-vue-next'
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
        { key: 'ac', label: 'Acceptance', value: total ? `${((accepted / total) * 100).toFixed(1)}%` : '-' },
        { key: 'total', label: 'Submissions', value: String(total) },
    ]
})
</script>
