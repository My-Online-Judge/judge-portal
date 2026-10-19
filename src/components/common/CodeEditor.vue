<template>
    <div class="overflow-hidden" :style="{ height: height }"
        :class="{ 'opacity-50 pointer-events-none': disabled }">
        <vue-monaco-editor :value="modelValue" @update:value="$emit('update:modelValue', $event)" :language="language" :theme="theme"
            :options="options" @mount="onMount" />
    </div>
</template>

<script setup lang="ts">
import type { MonacoEditor } from '@guolao/vue-monaco-editor'

export type MonacoInstance = MonacoEditor
export type CodeEditorInstance = ReturnType<MonacoEditor['editor']['create']>

withDefaults(defineProps<{
    modelValue: string
    language?: string
    theme?: string
    height?: string
    disabled?: boolean
    options?: Record<string, unknown>
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
    // The Monaco editor is ready: register keybindings and the like on it.
    (e: 'mount', editor: CodeEditorInstance, monaco: MonacoInstance): void
}>()

const onMount = (editor: CodeEditorInstance, monaco: MonacoInstance) => emit('mount', editor, monaco)
</script>
