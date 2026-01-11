<template>
    <div class="space-y-6">
        <!-- Information -->
        <Card>
            <CardHeader class="pb-3 border-b border-slate-100">
                <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Info class="h-6 w-6" />
                    Information
                </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4 text-sm">
                <div class="flex justify-between items-center py-1 border-b border-slate-50">
                    <span class="text-slate-500">ID</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger as-child>
                                <span class="font-mono font-medium text-slate-900 truncate max-w-[120px]">
                                    {{ problem.id }}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{{ problem.id }}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-50">
                    <span class="text-slate-500">Time Limit</span>
                    <span class="font-mono font-medium text-slate-900">{{ problem.timeLimit }}ms</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-50">
                    <span class="text-slate-500">Memory Limit</span>
                    <span class="font-mono font-medium text-slate-900">{{ problem.memoryLimit }}MB</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-50">
                    <span class="text-slate-500">Created By</span>
                    <span class="font-medium text-blue-600">{{ problem.createdBy }}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-slate-50">
                    <span class="text-slate-500">Level</span>
                    <Badge :class="getLevelInfo(problem.hardnessLevel).class" class="border-0 rounded-md">
                        {{ getLevelInfo(problem.hardnessLevel).text }}
                    </Badge>
                </div>
            </CardContent>
        </Card>

        <!-- Statistics -->
        <Card>
            <CardHeader class="border-b border-slate-100">
                <CardTitle class="text-sm font-bold flex items-center justify-between">
                    <div class="flex items-center align-center gap-2">
                        <PieChart class="h-6 w-6 text-bl" />
                        Statistics
                    </div>

                    <Dialog>
                        <DialogTrigger v-if="problem.totalSubmission" as-child>
                            <Button variant="outline" size="sm" class="h-8 text-xs cursor-pointer">Details</Button>
                        </DialogTrigger>
                        <DialogContent class="sm:max-w-[800px] max-h-[90vh]">
                            <DialogHeader>
                                <DialogTitle>Submission Statistics</DialogTitle>
                            </DialogHeader>
                            <!-- Restructured chart container for perfect centering -->
                            <div v-if="!problem.totalSubmission" class="flex items-center justify-center h-[300px] text-slate-400">
                                No data
                            </div>
                            <div v-else class="relative w-full max-w-[600px] mx-auto" style="aspect-ratio: 1/1;">
                                <!-- Outer Doughnut Chart - takes full container -->
                                <div class="absolute inset-0">
                                    <Doughnut :data="detailedOuterData" :options="outerChartOptions" class="w-full h-full" />
                                </div>

                                <!-- Inner Pie Chart - positioned to align with donut hole accounting for padding -->
                                <div class="absolute pointer-events-none"
                                    style="top: 16%; bottom: 30px; left: 60px; right: 60px; display: flex; align-items: center; justify-content: center;">
                                    <div class="w-[55%] h-[55%] flex items-center justify-center">
                                        <Pie :data="detailedInnerData" :options="innerChartOptions" class="w-full h-full"
                                            style="pointer-events: auto" />
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardTitle>
            </CardHeader>
            <CardContent class="p-4 flex flex-col items-center justify-center">
                <div class="flex justify-center align-center gap-4 mb-4">
                    <div class="flex items-center gap-1">
                        <div class="h-4 w-8 rounded-xs bg-emerald-500"></div>
                        <span class="text-slate-600">AC</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <div class="h-4 w-8 rounded-xs bg-rose-500"></div>
                        <span class="text-slate-600">WA</span>
                    </div>
                </div>
                <div class="relative h-40 w-full flex items-center justify-center">
                    <div v-if="!problem.totalSubmission" class="text-slate-400 text-sm">No data</div>
                    <Pie v-else :data="simpleChartData" :options="simpleChartOptions" />
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

import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, PieController, DoughnutController } from 'chart.js'
import { Doughnut, Pie } from 'vue-chartjs'
import ChartDataLabels from 'chartjs-plugin-datalabels'

ChartJS.register(ArcElement, ChartTooltip, Legend, ChartDataLabels, PieController, DoughnutController)

const props = defineProps<{
    problem: Problem
}>()

// Simple Chart Options (Sidebar)
const simpleChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
            display: true,
            color: '#fff',
            font: { weight: 'normal' as const, size: 12 },
            formatter: (value: number, ctx: any) => {
                const label = ctx.chart.data.labels[ctx.dataIndex];
                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(2) + '%' : '0%';
                if (value === 0) return '';
                // Simple label: AC: 10\n50%
                return `${label}: ${value}\n${percentage}`;
            },
            textAlign: 'center' as const
        }
    }
}

const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
}

const outerChartOptions = {
    ...commonOptions,
    cutout: '65%',
    layout: {
        padding: {
            top: 60,
            bottom: 30,
            left: 60,
            right: 60
        }
    },
    plugins: {
        legend: {
            display: true,
            position: 'top' as const,
            align: 'center' as const,
            labels: {
                usePointStyle: true,
                pointStyle: 'rectRounded',
                boxWidth: 10,
                boxHeight: 10,
                borderRadius: 4,
                padding: 12,
                font: { size: 13 }
            }
        },
        datalabels: {
            display: (ctx: any) => ctx.dataset.data[ctx.dataIndex] > 0,
            color: (ctx: any) => ctx.dataset.backgroundColor[ctx.dataIndex],
            anchor: 'end' as const,
            align: 'end' as const,
            offset: 8,
            font: { size: 13, weight: 'normal' as const },
            formatter: (value: number, ctx: any) => {
                const label = ctx.chart.data.labels[ctx.dataIndex];
                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1) + '%';
                return `${label}: ${value}\n${percentage}`;
            },
            textAlign: 'center' as const
        }
    }
}

const innerChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    layout: {
        padding: 0
    },
    plugins: {
        legend: { display: false },
        datalabels: {
            color: '#fff',
            anchor: 'center' as const,
            align: 'center' as const,
            font: { size: 12, weight: 'bold' as const },
            formatter: (value: number, ctx: any) => {
                const label = ctx.chart.data.labels[ctx.dataIndex];
                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1) + '%';
                return value > 0 ? `${label}\n${value}\n${percentage}` : '';
            },
            textAlign: 'center' as const
        }
    }
}

const simpleChartData = computed(() => {
    const ac = props.problem.acceptedSubmission || 0
    const total = props.problem.totalSubmission || 0
    const wa = total - ac

    return {
        labels: ['AC', 'WA'],
        datasets: [{
            backgroundColor: [STATUS_CONFIG[SubmissionStatus.SUCCESS].color, STATUS_CONFIG[SubmissionStatus.WRONG_ANSWER].color],
            data: [ac, wa],
            borderWidth: 0
        }]
    }
})

const getStatData = () => {
    const info = props.problem.statisticInfo || {}
    const getData = (status: SubmissionStatus) => Number(info[status.toString()] || 0)

    const ac = getData(SubmissionStatus.SUCCESS)
    const wa = getData(SubmissionStatus.WRONG_ANSWER)
    const tle = getData(SubmissionStatus.TIME_LIMIT_EXCEEDED) + getData(SubmissionStatus.REAL_TIME_LIMIT_EXCEEDED)
    const mle = getData(SubmissionStatus.MEMORY_LIMIT_EXCEEDED)
    const re = getData(SubmissionStatus.RUNTIME_ERROR)
    const se = getData(SubmissionStatus.SYSTEM_ERROR)
    const ce = 0 // Assuming CE is not mapped or is 0 for now as per previous code

    const data = [ac, tle, mle, re, wa, ce, se]
    // Filter statuses for labels/colors
    const statuses = [
        SubmissionStatus.SUCCESS,
        SubmissionStatus.TIME_LIMIT_EXCEEDED,
        SubmissionStatus.MEMORY_LIMIT_EXCEEDED,
        SubmissionStatus.RUNTIME_ERROR,
        SubmissionStatus.WRONG_ANSWER,
        // CE?
        SubmissionStatus.SYSTEM_ERROR
    ]
    // Need to align data with statuses.
    // Let's reconstruction to be safe
    return {
        ac, wa, tle, mle, re, se, ce,
        total: ac + wa + tle + mle + re + se + ce
    }
}

const detailedOuterData = computed(() => {
    const s = getStatData()
    // Order: AC, TLE, MLE, RE, WA, CE, SE (CE added for completeness if needed, else ignore)
    // Actually let's follow the user image order roughly: AC (Green) -> Others

    const labels = ['AC', 'TLE', 'MLE', 'RE', 'WA', 'SE']
    const data = [s.ac, s.tle, s.mle, s.re, s.wa, s.se]
    const backgroundColor = [
        STATUS_CONFIG[SubmissionStatus.SUCCESS].color,
        STATUS_CONFIG[SubmissionStatus.TIME_LIMIT_EXCEEDED].color,
        STATUS_CONFIG[SubmissionStatus.MEMORY_LIMIT_EXCEEDED].color,
        STATUS_CONFIG[SubmissionStatus.RUNTIME_ERROR].color,
        STATUS_CONFIG[SubmissionStatus.WRONG_ANSWER].color,
        STATUS_CONFIG[SubmissionStatus.SYSTEM_ERROR].color
    ]

    return {
        labels,
        datasets: [{
            backgroundColor,
            data,
            borderWidth: 1
        }]
    }
})

const detailedInnerData = computed(() => {
    const s = getStatData()
    const total = s.total
    const nonAc = total - s.ac

    return {
        labels: ['AC', 'Non-AC'],
        datasets: [{
            backgroundColor: [STATUS_CONFIG[SubmissionStatus.SUCCESS].color, STATUS_CONFIG[SubmissionStatus.WRONG_ANSWER].color],
            data: [s.ac, nonAc],
            borderWidth: 0
        }]
    }
})
</script>
