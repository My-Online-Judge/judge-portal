<template>
    <div class="border border-slate-200 rounded-md overflow-hidden" :style="{ height: height }"
        :class="{ 'opacity-50 pointer-events-none': disabled }">
        <vue-monaco-editor :value="modelValue" @update:value="$emit('update:modelValue', $event)" :language="language" :theme="theme"
            :options="options" />
    </div>
</template>

<script setup lang="ts">


const props = withDefaults(defineProps<{
    modelValue: string
    language?: string
    theme?: string
    height?: string
    disabled?: boolean
    options?: Record<string, any>
}>(), {
    language: 'plaintext',
    theme: 'vs-light',
    height: '400px',
    disabled: false,
    options: () => ({
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4
    })
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
}>()
</script>
