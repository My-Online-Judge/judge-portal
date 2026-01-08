<template>
    <div class="flex items-center justify-between mb-4">
        <div>
            <h1 class="text-2xl font-bold text-slate-900">{{ problem.id }}. {{ problem.title }}</h1>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    problem: {
        id: number
        title: string
        timeLimit: number
        memoryLimit: number
    }
}>()
</script>
