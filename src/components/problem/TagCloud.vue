<template>
    <div class="rounded-xl border border-border bg-card p-6">
        <div class="mb-4 flex items-center justify-between">
            <h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</h3>
            <a href="#" class="text-xs text-muted-foreground transition-colors hover:text-foreground">View all</a>
        </div>

        <div class="flex flex-wrap gap-2">
            <Badge v-for="tag in tags" :key="tag" variant="secondary"
                class="cursor-pointer rounded-md border-0 bg-muted px-3 py-1.5 text-xs font-normal text-muted-foreground transition-colors hover:bg-muted/70"
                :class="{ '!bg-foreground !text-background': isHighlighted(tag) }">
                {{ tag }}
            </Badge>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

const tags = [
    'DP', 'Math', 'Greedy',
    'Strings', 'Graphs',
    'Data Structures', 'Geometry',
    'Number Theory', 'Trees',
    'Sorting', 'Binary Search',
    'BFS/DFS', 'Bitmask',
    'Constructive', 'Two Pointers'
]

const isHighlighted = (tag: string) => {
    return ['Strings', 'Graphs', 'BFS/DFS'].includes(tag);
}
</script>
