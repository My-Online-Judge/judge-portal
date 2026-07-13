<template>
    <div class="space-y-6">
        <!-- Information -->
        <Card>
            <CardHeader class="border-b border-border pb-3">
                <CardTitle class="flex items-center gap-2 text-sm font-semibold">
                    <Info class="h-5 w-5 text-muted-foreground" />
                    Information
                </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4 text-sm">
                <div class="flex items-center justify-between border-b border-border py-1">
                    <span class="text-muted-foreground">ID</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <span class="tabular max-w-[120px] truncate font-medium text-foreground">
                                    {{ problem.id }}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{{ problem.id }}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div class="flex justify-between border-b border-border py-1">
                    <span class="text-muted-foreground">Time Limit</span>
                    <span class="tabular font-medium text-foreground">{{ problem.timeLimit }} ms</span>
                </div>
                <div class="flex justify-between border-b border-border py-1">
                    <span class="text-muted-foreground">Memory Limit</span>
                    <span class="tabular font-medium text-foreground">{{ problem.memoryLimit }} MB</span>
                </div>
                <div class="flex justify-between border-b border-border py-1">
                    <span class="text-muted-foreground">Created By</span>
                    <span class="font-medium text-foreground">{{ problem.createdBy }}</span>
                </div>
                <div class="flex items-center justify-between py-1">
                    <span class="text-muted-foreground">Level</span>
                    <Badge :class="getLevelInfo(problem.hardnessLevel).class" class="rounded-md border-0 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                        {{ getLevelInfo(problem.hardnessLevel).text }}
                    </Badge>
                </div>
            </CardContent>
        </Card>

        <!-- Statistics -->
        <Card>
            <CardHeader class="border-b border-border">
                <CardTitle class="flex items-center justify-between text-sm font-semibold">
                    <div class="flex items-center gap-2">
                        <PieChart class="h-5 w-5 text-muted-foreground" />
                        Statistics
                    </div>

                    <Dialog>
                        <DialogTrigger v-if="problem.totalSubmission" as-child>
                            <Button variant="outline" size="sm" class="h-8 cursor-pointer text-xs">Details</Button>
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
                </CardTitle>
            </CardHeader>
            <CardContent class="p-5">
                <div v-if="!problem.totalSubmission" class="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    No submissions yet
                </div>
                <div v-else class="flex items-center gap-4">
                    <div class="relative h-24 w-24 shrink-0">
                        <Doughnut :data="miniData" :options="donutOptions" />
                        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span class="tabular text-lg font-semibold text-foreground">{{ acRate }}%</span>
                            <span class="text-[10px] uppercase tracking-wide text-muted-foreground">AC rate</span>
                        </div>
                    </div>
                    <div class="flex-1 space-y-2 text-sm">
                        <div class="flex items-center justify-between gap-3">
                            <span class="flex items-center gap-2 text-muted-foreground">
                                <span class="h-2.5 w-2.5 rounded-[3px]" :style="{ backgroundColor: acColor }"></span>Accepted
                            </span>
                            <span class="tabular font-medium text-foreground">{{ acCount }}</span>
                        </div>
                        <div class="flex items-center justify-between gap-3">
                            <span class="flex items-center gap-2 text-muted-foreground">
                                <span class="h-2.5 w-2.5 rounded-[3px] bg-muted-foreground/30"></span>Others
                            </span>
                            <span class="tabular font-medium text-foreground">{{ otherCount }}</span>
                        </div>
                        <div class="flex items-center justify-between gap-3 border-t border-border pt-2">
                            <span class="text-muted-foreground">Total</span>
                            <span class="tabular font-medium text-foreground">{{ problem.totalSubmission }}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Info, PieChart } from 'lucide-vue-next'
import { type Problem, getLevelInfo, SubmissionStatus, STATUS_CONFIG } from '@/types/problem'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, DoughnutController } from 'chart.js'
import { Doughnut } from 'vue-chartjs'

ChartJS.register(ArcElement, ChartTooltip, Legend, DoughnutController)

const props = defineProps<{
    problem: Problem
}>()

const acColor = STATUS_CONFIG[SubmissionStatus.SUCCESS].color

const acCount = computed(() => props.problem.acceptedSubmission || 0)
const otherCount = computed(() => Math.max(0, (props.problem.totalSubmission || 0) - acCount.value))
const acRate = computed(() => {
    const total = props.problem.totalSubmission || 0
    return total ? Math.round((acCount.value / total) * 100) : 0
})

// Flat donut, no floating labels; the accompanying list is the legend, tooltip on hover.
const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: { label: (ctx: { label: string; parsed: number }) => ` ${ctx.label}: ${ctx.parsed}` },
        },
    },
}

const miniData = computed(() => ({
    labels: ['Accepted', 'Others'],
    datasets: [{
        backgroundColor: [acColor, '#e3e6ec'],
        data: [acCount.value, otherCount.value],
        borderWidth: 0,
    }],
}))

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
