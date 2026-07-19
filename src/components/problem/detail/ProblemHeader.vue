<template>
    <div class="mb-5 space-y-3">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 class="font-display text-4xl text-foreground">{{ problem.title }}</h1>
            <Badge :class="getLevelInfo(problem.hardnessLevel).class"
                class="rounded-md border-0 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                {{ getLevelInfo(problem.hardnessLevel).text }}
            </Badge>
        </div>

        <div v-if="problem.tags?.length" class="flex flex-wrap gap-2">
            <Badge v-for="tag in problem.tags" :key="tag" variant="secondary"
                class="rounded-md text-[11px] font-medium text-muted-foreground">
                {{ tag }}
            </Badge>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { type Problem, getLevelInfo } from '@/types/problem'

defineProps<{
    problem: Problem
}>()
</script>
