<template>
    <span :class="['vchip', `v-${meta.tone}`, size === 'md' ? '' : size]" :title="meta.name">
        <span v-if="!meta.icon" class="spin" data-test="spinner" aria-hidden="true" />
        <component :is="meta.icon" v-else aria-hidden="true" />
        <span :class="{ 'sr-only': label && meta.code.length >= 4 }">{{ meta.code }}</span>
        <span v-if="label" class="full">{{ label }}</span>
        <span v-else class="sr-only">{{ meta.name }}</span>
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { verdictMeta } from '@/lib/verdict'

const props = withDefaults(
    defineProps<{
        status: number
        size?: 'sm' | 'md' | 'lg'
        label?: string
    }>(),
    { size: 'md', label: undefined },
)

const meta = computed(() => verdictMeta(props.status))
</script>
