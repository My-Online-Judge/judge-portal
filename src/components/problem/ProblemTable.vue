<template>
    <div>
        <!-- Table from 640 px up -->
        <Table class="hidden sm:table">
            <TableHeader>
                <TableRow class="border-border bg-muted/30 text-xs font-medium text-muted-foreground hover:bg-muted/30">
                    <TableHead class="min-w-[200px] pl-4">Title</TableHead>
                    <TableHead class="w-[140px]">Difficulty</TableHead>
                    <TableHead class="w-[120px] text-right">Acceptance</TableHead>
                    <TableHead class="w-[130px] pr-4 text-right">Submissions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="problem in problems" :key="problem.id"
                    class="border-border transition-colors hover:bg-muted/40">
                    <TableCell class="pl-4">
                        <RouterLink :to="'/problems/' + problem.problemSlug"
                            class="block font-semibold text-foreground transition-colors hover:text-link">
                            {{ problem.title }}
                        </RouterLink>
                        <div v-if="showTags && problem.tags?.length" class="mt-1 flex flex-wrap gap-1">
                            <span v-for="tag in problem.tags" :key="tag" :class="staticTag">{{ tag }}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <DifficultyBadge :level="problem.hardnessLevel" />
                    </TableCell>
                    <TableCell class="text-right font-mono text-[13px] tabular-nums">
                        {{ acceptance(problem) }}
                    </TableCell>
                    <TableCell class="pr-4 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
                        {{ problem.totalSubmission || '-' }}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <!-- Two-line list items under 640 px -->
        <ul class="m-0 list-none p-0 sm:hidden">
            <li v-for="problem in problems" :key="problem.id" class="border-b border-border last:border-b-0">
                <RouterLink :to="'/problems/' + problem.problemSlug"
                    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 px-3 py-[11px]">
                    <span class="min-w-0 truncate text-[13.5px] font-semibold text-foreground">{{ problem.title }}</span>
                    <ChevronRight class="size-4 text-muted-foreground" aria-hidden="true" />
                    <span class="col-span-2 flex items-center gap-2.5 text-xs text-muted-foreground">
                        <DifficultyBadge :level="problem.hardnessLevel" />
                        <span class="font-mono">Acceptance {{ acceptance(problem) }}</span>
                    </span>
                    <span v-if="showTags && problem.tags?.length" class="col-span-2 flex flex-wrap gap-1">
                        <span v-for="tag in problem.tags" :key="tag" :class="staticTag">{{ tag }}</span>
                    </span>
                </RouterLink>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import type { Problem } from '@/types/problem'

withDefaults(defineProps<{
    problems: Problem[]
    showTags?: boolean
}>(), {
    showTags: true,
})

const staticTag = 'inline-flex h-[22px] items-center whitespace-nowrap rounded-md border border-border bg-card px-2 font-mono text-[11.5px] text-foreground'

// One decimal, or "-" when nobody has submitted yet.
const acceptance = (p: Problem) =>
    p.totalSubmission ? `${((p.acceptedSubmission / p.totalSubmission) * 100).toFixed(1)}%` : '-'
</script>
