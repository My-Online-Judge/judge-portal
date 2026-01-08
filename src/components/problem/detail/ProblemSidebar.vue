<template>
    <div class="space-y-6">
        <!-- Information -->
        <Card>
            <CardHeader class="pb-3 border-b border-slate-100">
                <CardTitle class="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Info class="h-4 w-4 text-slate-500" />
                    Information
                </CardTitle>
            </CardHeader>
            <CardContent class="p-4 space-y-4 text-sm">
                <div class="flex justify-between py-1 border-b border-slate-50">
                    <span class="text-slate-500">ID</span>
                    <span class="font-mono font-medium text-slate-900">{{ problem.id }}</span>
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
                    <Badge class="bg-emerald-500 hover:bg-emerald-600 border-0 rounded-md">{{ problem.level }}</Badge>
                </div>
            </CardContent>
        </Card>

        <!-- Statistics -->
        <Card>
            <CardHeader class="pb-3 border-b border-slate-100">
                <CardTitle class="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <PieChart class="h-4 w-4 text-slate-500" />
                    Statistics
                </CardTitle>
            </CardHeader>
            <CardContent class="p-4 flex flex-col items-center justify-center">
                <div class="relative h-32 w-32 flex items-center justify-center">
                    <!-- Mock Donut/Pie -->
                    <div class="h-24 w-24 rounded-full border-[12px] border-emerald-500 border-r-rose-500 border-t-emerald-500 -rotate-45"></div>
                    <div class="absolute text-center">
                        <span class="block text-xl font-bold text-slate-900">{{ problem.total }}</span>
                        <span class="text-[10px] text-slate-500 uppercase">Total</span>
                    </div>
                </div>
                <div class="flex w-full justify-between mt-4 text-xs">
                    <div class="flex items-center gap-1">
                        <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
                        <span class="text-slate-600">AC: {{ problem.acRate }}%</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <div class="h-2 w-2 rounded-full bg-rose-500"></div>
                        <span class="text-slate-600">WA: {{ (100 - problem.acRate).toFixed(1) }}%</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, PieChart } from 'lucide-vue-next'

defineProps<{
    problem: {
        id: number
        timeLimit: number
        memoryLimit: number
        createdBy: string
        level: string
        total: number
        acRate: number
    }
}>()
</script>
