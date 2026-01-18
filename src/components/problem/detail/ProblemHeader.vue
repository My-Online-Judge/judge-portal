<template>
    <div class="flex items-center justify-between mb-4">
        <div>
            <h1 class="text-2xl font-bold text-slate-900">{{ problem.title }}</h1>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Problem } from '@/types/problem'

defineProps<{
    problem: Problem
}>()
</script>
