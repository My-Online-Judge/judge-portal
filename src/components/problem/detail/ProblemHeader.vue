<template>
    <header class="flex flex-col">
        <h1 v-if="!compact" class="text-2xl leading-tight font-bold tracking-[-0.015em] text-balance text-foreground">{{ problem.title }}</h1>
        <ul :class="[compact ? '' : 'mt-3.5', 'flex flex-wrap items-center gap-2']" aria-label="Difficulty and tags">
            <li v-if="!compact" :class="['inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-semibold', difficultyTone]"
                data-test="difficulty">
                {{ getLevelInfo(problem.hardnessLevel).text }}
            </li>
            <li v-for="tag in problem.tags" :key="tag"
                class="inline-flex h-[26px] items-center rounded-full bg-muted px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
                {{ tag }}
            </li>
        </ul>
        <ProblemMetaBar v-if="!compact" :problem="problem" class="mt-4 border-t border-border pt-3" />
    </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProblemMetaBar from './ProblemMetaBar.vue'
import { getLevelInfo, type Problem } from '@/types/problem'

const props = defineProps<{
    problem: Problem
    // On a phone the page's own header carries the title, difficulty and limits: only the tags stay.
    compact?: boolean
}>()

const TONES: Record<number, string> = {
    1: 'bg-success-soft text-success-ink',
    2: 'bg-warning-soft text-warning-ink',
    3: 'bg-destructive-soft text-destructive-ink',
}
const difficultyTone = computed(() => TONES[props.problem.hardnessLevel] ?? 'bg-muted text-muted-foreground')
</script>
