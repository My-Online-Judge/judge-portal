<template>
    <div class="flex flex-col gap-3">
        <h1 class="font-display text-2xl text-foreground">{{ problem.title }}</h1>
        <ProblemMetaBar :problem="problem" />
    </div>
</template>

<script setup lang="ts">
import ProblemMetaBar from './ProblemMetaBar.vue'
import type { Problem } from '@/types/problem'

defineProps<{
    problem: Problem
}>()
</script>
