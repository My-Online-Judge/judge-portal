<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { MAX_TAGS, normalizeTag } from '@/lib/tags'

const props = defineProps<{
    modelValue: string[]
    suggestions: string[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: string[]): void
}>()

const draft = ref('')
const error = ref('')
const focused = ref(false)

const full = computed(() => props.modelValue.length >= MAX_TAGS)

const filtered = computed(() => {
    const q = draft.value.trim().toLowerCase()
    return props.suggestions
        .filter((s) => !props.modelValue.includes(s) && (!q || s.includes(q)))
        .slice(0, 8)
})

const add = (raw: string) => {
    const result = normalizeTag(raw)
    if ('error' in result) {
        error.value = result.error
        return
    }
    error.value = ''
    draft.value = ''
    if (props.modelValue.includes(result.tag)) return
    emit('update:modelValue', [...props.modelValue, result.tag])
}

const remove = (tag: string) => emit('update:modelValue', props.modelValue.filter((t) => t !== tag))

const onKeydown = (e: KeyboardEvent) => {
    if (e.isComposing) return // an IME is still composing: Enter/comma belong to it
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        if (draft.value.trim()) add(draft.value)
    } else if (e.key === 'Backspace' && draft.value === '' && props.modelValue.length) {
        remove(props.modelValue[props.modelValue.length - 1]!)
    }
}

const onInput = (e: Event) => {
    draft.value = (e.target as HTMLInputElement).value
    error.value = ''
}
</script>

<template>
    <div class="relative space-y-1.5">
        <div class="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
            <span v-for="tag in modelValue" :key="tag"
                class="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">
                {{ tag }}
                <button type="button" class="text-muted-foreground hover:text-foreground"
                    :aria-label="`Remove tag ${tag}`" @click="remove(tag)">
                    <X class="size-3" />
                </button>
            </span>
            <input
                :value="draft"
                :disabled="full"
                :placeholder="full ? `Maximum ${MAX_TAGS} tags` : 'Add a tag…'"
                :aria-invalid="error ? true : undefined"
                aria-label="Add tag"
                class="min-w-[8rem] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                @input="onInput"
                @keydown="onKeydown"
                @focus="focused = true"
                @blur="focused = false" />
        </div>
        <ul v-if="focused && !full && filtered.length"
            class="absolute z-10 max-h-48 w-full overflow-auto rounded-md border border-border bg-background p-1 shadow-md">
            <li v-for="s in filtered" :key="s" data-testid="tag-suggestion"
                class="cursor-pointer rounded px-2 py-1 text-sm text-foreground hover:bg-muted"
                @mousedown.prevent="add(s)">
                {{ s }}
            </li>
        </ul>
        <p v-if="error" role="alert" class="text-xs text-destructive">{{ error }}</p>
    </div>
</template>
