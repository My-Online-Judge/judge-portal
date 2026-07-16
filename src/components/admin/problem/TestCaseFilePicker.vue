<template>
    <div class="flex items-center gap-2">
        <label
            class="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
        >
            <Upload class="size-3.5" />
            {{ label }}
            <input
                ref="fileInput"
                type="file"
                :accept="accept"
                class="sr-only"
                @change="onPick"
            >
        </label>
        <template v-if="modelValue">
            <span class="min-w-0 truncate font-mono text-xs text-muted-foreground">{{ modelValue.name }}</span>
            <button
                type="button"
                class="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Clear file"
                @click="clear"
            >
                <X class="size-3.5" />
            </button>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Upload, X } from 'lucide-vue-next'

defineProps<{
    modelValue: File | null
    accept: string
    label: string
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: File | null): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const onPick = (e: Event) => {
    emit('update:modelValue', (e.target as HTMLInputElement).files?.[0] ?? null)
}

const clear = () => {
    if (fileInput.value) fileInput.value.value = ''
    emit('update:modelValue', null)
}
</script>
