<template>
    <!-- The statement has the pane to itself: no tabs, one scroll. Submissions live in the console beside the code. -->
    <div class="h-full overflow-y-auto bg-card">
        <article :class="['flex max-w-[46rem] flex-col px-6 pb-10 lg:px-8', compact ? 'gap-4 pt-4' : 'gap-[26px] pt-7']">
            <ProblemHeader v-if="!compact || problem.tags?.length" :problem="problem" :compact="compact" />
            <ProblemDescription :problem="problem" />
        </article>
    </div>
</template>

<script setup lang="ts">
import ProblemHeader from './ProblemHeader.vue'
import ProblemDescription from './ProblemDescription.vue'
import type { Problem } from '@/types/problem'

defineProps<{ problem: Problem; compact?: boolean }>()
</script>
