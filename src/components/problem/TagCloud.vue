<template>
    <div class="rounded-xl border bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
                <div class="h-4 w-1 bg-blue-500 rounded-full"></div>
                <h3 class="text-lg font-bold text-slate-800">Tags</h3>
            </div>
            <a href="#" class="text-xs font-medium text-blue-600 hover:underline">View all</a>
        </div>

        <div class="flex flex-wrap gap-2">
            <Badge v-for="tag in tags" :key="tag" variant="secondary"
                class="cursor-pointer font-normal px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 border-0 rounded-md transition-colors"
                :class="{ 'bg-[#1e293b] text-white hover:bg-slate-800': isHighlighted(tag) }">
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
