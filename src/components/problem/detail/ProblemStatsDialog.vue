<template>
    <Dialog>
        <DialogTrigger as-child>
            <slot />
        </DialogTrigger>
        <DialogContent class="sm:max-w-[560px]">
            <DialogHeader>
                <DialogTitle>Submission statistics</DialogTitle>
            </DialogHeader>
            <div v-if="!detailTotal" class="flex h-52 items-center justify-center text-sm text-muted-foreground">
                No submissions yet
            </div>
            <div v-else class="grid gap-8 pt-2 sm:grid-cols-[200px_1fr] sm:items-center">
                <div class="relative mx-auto h-48 w-48">
                    <Doughnut :data="detailData" :options="donutOptions" />
                    <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span class="tabular text-3xl font-semibold text-foreground">{{ detailTotal }}</span>
                        <span class="text-[11px] uppercase tracking-wide text-muted-foreground">submissions</span>
                    </div>
                </div>
                <ul class="divide-y divide-border">
                    <li v-for="row in breakdown" :key="row.key" class="flex items-center gap-3 py-2">
                        <span class="h-2.5 w-2.5 shrink-0 rounded-[3px]" :style="{ backgroundColor: row.color }"></span>
                        <span class="flex-1 text-sm text-foreground">{{ row.fullName }}</span>
                        <span class="tabular text-sm text-muted-foreground">{{ row.count }}</span>
                        <span class="tabular w-12 text-right text-sm font-medium text-foreground">{{ row.pct }}%</span>
                    </li>
                </ul>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { type Problem, SubmissionStatus, STATUS_CONFIG } from '@/types/problem'
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, DoughnutController } from 'chart.js'
import { Doughnut } from 'vue-chartjs'

ChartJS.register(ArcElement, ChartTooltip, Legend, DoughnutController)

const props = defineProps<{ problem: Problem }>()

const acColor = STATUS_CONFIG[SubmissionStatus.SUCCESS].color
const acCount = computed(() => props.problem.acceptedSubmission || 0)
const otherCount = computed(() => Math.max(0, (props.problem.totalSubmission || 0) - acCount.value))

// Flat donut, no floating labels or tooltip — the accompanying list already
// shows every value, and a tooltip only clips the small centered chart.
const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
    },
}

// Per-status breakdown from statisticInfo, falling back to AC / Others from the summary.
const breakdown = computed(() => {
    const info = props.problem.statisticInfo || {}
    const order = [
        SubmissionStatus.SUCCESS,
        SubmissionStatus.WRONG_ANSWER,
        SubmissionStatus.TIME_LIMIT_EXCEEDED,
        SubmissionStatus.REAL_TIME_LIMIT_EXCEEDED,
        SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
        SubmissionStatus.RUNTIME_ERROR,
        SubmissionStatus.COMPILE_ERROR,
        SubmissionStatus.PARTIALLY_ACCEPTED,
        SubmissionStatus.SYSTEM_ERROR,
    ]
    let rows = order
        .map((s) => ({
            key: String(s),
            fullName: STATUS_CONFIG[s]?.fullName ?? String(s),
            color: STATUS_CONFIG[s]?.color ?? '#94a3b8',
            count: Number(info[String(s)] || 0),
        }))
        .filter((r) => r.count > 0)

    if (rows.length === 0 && (props.problem.totalSubmission || 0) > 0) {
        rows = [
            { key: 'ac', fullName: 'Accepted', color: acColor, count: acCount.value },
            { key: 'other', fullName: 'Other verdicts', color: '#e2544e', count: otherCount.value },
        ].filter((r) => r.count > 0)
    }

    const total = rows.reduce((sum, r) => sum + r.count, 0)
    return rows.map((r) => ({ ...r, pct: total ? Number(((r.count / total) * 100).toFixed(1)) : 0 }))
})

const detailTotal = computed(() => breakdown.value.reduce((sum, r) => sum + r.count, 0))

const detailData = computed(() => ({
    labels: breakdown.value.map((r) => r.fullName),
    datasets: [{
        backgroundColor: breakdown.value.map((r) => r.color),
        data: breakdown.value.map((r) => r.count),
        borderWidth: 0,
    }],
}))
</script>
