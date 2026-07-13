<template>
    <div class="flex items-center justify-between mb-5">
        <div>
            <h1 class="font-display text-4xl text-foreground">{{ problem.title }}</h1>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Problem } from '@/types/problem'

defineProps<{
    problem: Problem
}>()
</script>
