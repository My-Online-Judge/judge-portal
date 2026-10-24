<template>
    <!-- The rows sit 12 px outside the column so their text lines up with the page head; hover and the rules reach the gutter. -->
    <div class="-mx-3">
        <!-- Table from 640 px up. Tags join it from xl: the rail takes 304 px from lg, and Title has to keep the rest. -->
        <Table class="hidden sm:table">
            <TableHeader>
                <TableRow class="hover:bg-transparent">
                    <TableHead scope="col">Title</TableHead>
                    <TableHead v-if="showTags" scope="col" class="hidden w-60 xl:table-cell">Tags</TableHead>
                    <TableHead scope="col" class="w-30">Difficulty</TableHead>
                    <TableHead scope="col" class="w-30 text-right">Acceptance</TableHead>
                    <TableHead scope="col" class="w-30 text-right">Submissions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="problem in problems" :key="problem.id">
                    <TableCell class="whitespace-normal">
                        <RouterLink :to="'/problems/' + problem.problemSlug"
                            class="text-base font-medium text-foreground hover:text-primary hover:underline">
                            {{ problem.title }}
                        </RouterLink>
                    </TableCell>
                    <TableCell v-if="showTags" data-col="tags" class="hidden whitespace-normal text-sm text-muted-foreground xl:table-cell">
                        {{ tagText(problem) }}
                    </TableCell>
                    <TableCell>
                        <DifficultyBadge :level="problem.hardnessLevel" />
                    </TableCell>
                    <TableCell class="text-right text-sm tabular-nums text-ink-2">
                        {{ acceptance(problem) }}
                    </TableCell>
                    <TableCell class="text-right text-sm tabular-nums text-ink-2">
                        {{ problem.totalSubmission || '-' }}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <!-- One link per problem under 640 px: title, tags, then difficulty against acceptance -->
        <ul class="m-0 list-none p-0 sm:hidden">
            <li v-for="problem in problems" :key="problem.id" class="border-b border-border">
                <RouterLink :to="'/problems/' + problem.problemSlug"
                    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-3 transition-colors hover:bg-muted">
                    <span class="min-w-0 text-base font-medium text-foreground">{{ problem.title }}</span>
                    <ChevronRight class="size-4 text-muted-foreground" aria-hidden="true" />
                    <span v-if="showTags && problem.tags?.length" class="col-span-2 text-sm text-muted-foreground">{{ tagText(problem) }}</span>
                    <span class="col-span-2 flex items-center justify-between gap-3 text-sm text-ink-2">
                        <DifficultyBadge :level="problem.hardnessLevel" />
                        <span class="tabular-nums">Acceptance {{ acceptance(problem) }}</span>
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

// Tags read as one line of text, "beginner, math", in the body face.
const tagText = (p: Problem) => (p.tags ?? []).join(', ')

// One decimal, or "-" when nobody has submitted yet.
const acceptance = (p: Problem) =>
    p.totalSubmission ? `${((p.acceptedSubmission / p.totalSubmission) * 100).toFixed(1)}%` : '-'
</script>
