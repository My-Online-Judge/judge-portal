<template>
    <div class="mb-5 space-y-3">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 class="font-display text-4xl text-foreground">{{ problem.title }}</h1>
            <DifficultyBadge :level="problem.hardnessLevel" />
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
import DifficultyBadge from '@/components/common/DifficultyBadge.vue'
import type { Problem } from '@/types/problem'

defineProps<{
    problem: Problem
}>()
</script>
