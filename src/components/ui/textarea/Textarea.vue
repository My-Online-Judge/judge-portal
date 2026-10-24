<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'

const props = defineProps<{
    class?: HTMLAttributes['class']
    defaultValue?: string | number
    modelValue?: string | number
}>()

const emits = defineEmits<{
    (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
    passive: true,
    defaultValue: props.defaultValue,
})
</script>

<template>
    <textarea v-model="modelValue" :class="cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base md:text-sm placeholder:text-muted-foreground transition-[color,border-color] duration-[120ms] motion-reduce:transition-none hover:border-[color-mix(in_oklch,var(--input)_60%,var(--foreground))] focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-ring aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
        props.class,
    )" />
</template>
