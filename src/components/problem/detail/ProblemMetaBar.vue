<template>
    <div class="flex flex-wrap items-center gap-2 text-[13px]">
        <span class="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-muted-foreground">
            <Clock class="h-3.5 w-3.5" />
            <span class="tabular text-foreground">{{ problem.timeLimit }} ms</span>
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-muted-foreground">
            <MemoryStick class="h-3.5 w-3.5" />
            <span class="tabular text-foreground">{{ problem.memoryLimit }} MB</span>
        </span>
        <ProblemStatsDialog :problem="problem">
            <button type="button"
                class="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-muted-foreground transition-colors hover:text-foreground">
                <PieChart class="h-3.5 w-3.5" />
                <span class="tabular text-foreground">{{ acRate }}%</span>
                AC
                <span class="text-muted-foreground/70">· {{ problem.totalSubmission || 0 }}</span>
            </button>
        </ProblemStatsDialog>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Clock, MemoryStick, PieChart } from 'lucide-vue-next'
import type { Problem } from '@/types/problem'
import ProblemStatsDialog from './ProblemStatsDialog.vue'

const props = defineProps<{ problem: Problem }>()

const acRate = computed(() => {
    const total = props.problem.totalSubmission || 0
    return total ? Math.round(((props.problem.acceptedSubmission || 0) / total) * 100) : 0
})
</script>
