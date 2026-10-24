<template>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <dl class="meta-dl">
            <div>
                <dt>Difficulty</dt>
                <dd><DifficultyBadge :level="problem.hardnessLevel" /></dd>
            </div>
            <div v-for="item in items" :key="item.key">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
            </div>
            <!-- Plain text: the problems list does not read a tag from the URL yet, so a link would lead nowhere. -->
            <div v-if="problem.tags?.length">
                <dt>Tags</dt>
                <dd>{{ problem.tags.join(', ') }}</dd>
            </div>
        </dl>
        <ProblemStatsDialog :problem="problem">
            <Button variant="ghost" size="sm" aria-haspopup="dialog">
                <ChartPie aria-hidden="true" />
                Statistics
            </Button>
        </ProblemStatsDialog>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChartPie } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import type { Problem } from '@/types/problem'
import ProblemStatsDialog from './ProblemStatsDialog.vue'

const props = defineProps<{ problem: Problem }>()

// The time limit is stored in milliseconds; it reads in seconds ("2 s", "1.5 s").
const seconds = (ms: number) => `${Number(((ms || 0) / 1000).toFixed(2))} s`

const items = computed(() => {
    const total = props.problem.totalSubmission || 0
    const accepted = props.problem.acceptedSubmission || 0
    return [
        { key: 'time', label: 'Time limit', value: seconds(props.problem.timeLimit) },
        { key: 'memory', label: 'Memory limit', value: `${props.problem.memoryLimit} MB` },
        { key: 'ac', label: 'Acceptance', value: total ? `${((accepted / total) * 100).toFixed(1)}%` : '-' },
        { key: 'total', label: 'Submissions', value: `${total}` },
    ]
})
</script>
