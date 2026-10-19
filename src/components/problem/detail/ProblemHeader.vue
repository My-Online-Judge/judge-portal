<template>
    <div class="flex flex-col gap-2.5">
        <h1 class="text-[20px] leading-tight font-bold tracking-[-0.02em] text-foreground">{{ problem.title }}</h1>
        <ProblemMetaBar :problem="problem" />
        <div v-if="problem.tags?.length" class="flex flex-wrap gap-1.5">
            <span v-for="tag in problem.tags" :key="tag"
                class="inline-flex h-[22px] items-center rounded-md border border-border bg-card px-2 font-mono text-[11.5px] whitespace-nowrap text-foreground">
                {{ tag }}
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
import ProblemMetaBar from './ProblemMetaBar.vue'
import type { Problem } from '@/types/problem'

defineProps<{
    problem: Problem
}>()
</script>
