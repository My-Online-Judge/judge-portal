<template>
    <div>
        <Table>
            <TableHeader>
                <TableRow class="border-b border-slate-100 text-sm font-semibold text-slate-500 bg-slate-100">
                    <TableHead class="w-[60px] pl-4">#</TableHead>
                    <TableHead class="min-w-[200px]">Title</TableHead>
                    <TableHead class="w-[120px]">Level</TableHead>
                    <TableHead class="w-[120px]">Total</TableHead>
                    <TableHead class="w-[200px]">AC Rate</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="(problem, index) in problems" :key="problem.id"
                    class="hover:bg-slate-50/80 border-b border-slate-50 transition-colors h-14">
                    <TableCell class="pl-4 font-normal text-slate-500">{{ index + 1 }}</TableCell>
                    <TableCell>
                        <RouterLink :to="'/problems/' + problem.id" class="block font-medium text-slate-700 hover:text-blue-600 transition-colors">
                            {{ problem.title }}
                        </RouterLink>
                    </TableCell>
                    <TableCell>
                        <Badge :class="getLevelColor(problem.level)" class="px-2.5 py-0.5 rounded-sm font-bold border-0">
                            {{ problem.level }}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <div class="flex items-center gap-1.5 text-slate-500">
                            <User class="h-3.5 w-3.5" />
                            <span class="text-sm">{{ problem.total }}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <div class="flex items-center gap-3">
                            <Progress :model-value="problem.acRate" class="h-1.5 w-24 bg-slate-100"
                                :indicator-class="getProgressColor(problem.acRate)" />
                            <span class="text-xs font-medium text-slate-500">{{ problem.acRate }}%</span>
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>
</template>

<script setup lang="ts">
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { User } from 'lucide-vue-next'

interface Problem {
    id: number
    title: string
    level: string
    total: number
    acRate: number
}

defineProps<{
    problems: Problem[]
}>()

const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
        case 'easy': return 'bg-emerald-500 hover:bg-emerald-600 text-white'
        case 'medium': return 'bg-amber-500 hover:bg-amber-600 text-white'
        case 'hard': return 'bg-rose-500 hover:bg-rose-600 text-white'
        default: return 'bg-slate-500 hover:bg-slate-600 text-white'
    }
}

const getProgressColor = (rate: number) => {
    if (rate > 50) return 'bg-emerald-500'
    if (rate > 30) return 'bg-amber-500'
    return 'bg-rose-500'
}
</script>
<style scoped>
/* Override progress indicator color based on parent class if needed, or keeping it simple for now */
</style>
