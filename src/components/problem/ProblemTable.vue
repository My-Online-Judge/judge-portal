<template>
    <div>
        <Table>
            <TableHeader>
                <TableRow class="border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:bg-muted/30">
                    <TableHead class="w-[60px] pl-4">#</TableHead>
                    <TableHead class="min-w-[200px]">Title</TableHead>
                    <TableHead v-if="showTags" class="w-[220px]">Tags</TableHead>
                    <TableHead class="w-[120px]">Level</TableHead>
                    <TableHead class="w-[120px]">Total</TableHead>
                    <TableHead class="w-[200px]">AC Rate</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="(problem, index) in problems" :key="problem.id"
                    class="h-14 border-border transition-colors hover:bg-muted/40">
                    <TableCell class="tabular pl-4 text-muted-foreground">{{ index + 1 }}</TableCell>
                    <TableCell>
                        <RouterLink :to="'/problems/' + problem.problemSlug"
                            class="block font-medium text-foreground transition-colors hover:text-primary">
                            {{ problem.title }}
                        </RouterLink>
                    </TableCell>
                    <TableCell v-if="showTags">
                        <div class="flex flex-wrap gap-1.5">
                            <Badge v-for="tag in problem.tags || []" :key="tag" variant="secondary"
                                class="rounded-md border-0 bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                                {{ tag }}
                            </Badge>
                            <span v-if="!(problem.tags && problem.tags.length)" class="text-xs text-muted-foreground">—</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge :class="getLevelInfo(problem.hardnessLevel).class" class="rounded-md border-0 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                            {{ getLevelInfo(problem.hardnessLevel).text }}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <span class="tabular text-sm text-muted-foreground">{{ problem.totalSubmission }}</span>
                    </TableCell>
                    <TableCell>
                        <div class="flex items-center gap-3">
                            <Progress :model-value="calculateAcRate(problem.acceptedSubmission, problem.totalSubmission)"
                                class="h-1.5 w-24 bg-muted"
                                indicator-class="bg-primary" />
                            <span class="tabular text-xs text-muted-foreground">
                                {{ calculateAcRate(problem.acceptedSubmission, problem.totalSubmission) }}%
                            </span>
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
import { type Problem, getLevelInfo } from '@/types/problem'

withDefaults(defineProps<{
    problems: Problem[]
    showTags?: boolean
}>(), {
    showTags: false,
})

const calculateAcRate = (accepted: number, total: number) => {
    if (!total) return 0
    return Number(((accepted / total) * 100).toFixed(1))
}
</script>
<style scoped>
/* Override progress indicator color based on parent class if needed, or keeping it simple for now */
</style>
