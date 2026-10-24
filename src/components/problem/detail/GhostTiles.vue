<template>
    <div
        :class="['tiles', 'ghost-tiles']"
        role="img"
        :aria-label="state === 'running' ? 'Judging tests' : 'Waiting in queue'"
    >
        <span v-for="i in count" :key="i" :class="['tile', state === 'running' ? 'running' : 'v-pending']" aria-hidden="true">
            <span class="tn">{{ i }}</span>
        </span>
    </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ count?: number; state: 'pending' | 'running' }>(), { count: 12 })
</script>
