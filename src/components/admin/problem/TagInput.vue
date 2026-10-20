<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
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
    <div class="relative flex flex-col gap-1.5">
        <div
            class="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-card p-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25"
            :class="error && 'border-destructive'"
        >
            <Badge v-for="tag in modelValue" :key="tag" variant="mono" class="gap-1 pr-1">
                {{ tag }}
                <button
                    type="button"
                    class="grid size-4 cursor-pointer place-items-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :aria-label="`Remove tag ${tag}`"
                    @click="remove(tag)"
                >
                    <X class="size-3" aria-hidden="true" />
                </button>
            </Badge>
            <input
                :value="draft"
                :disabled="full"
                :placeholder="full ? `Maximum ${MAX_TAGS} tags` : 'Add a tag…'"
                :aria-invalid="error ? true : undefined"
                aria-label="Add tag"
                class="h-[22px] min-w-[8rem] flex-1 bg-transparent font-mono text-[12.5px] text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground disabled:cursor-not-allowed"
                @input="onInput"
                @keydown="onKeydown"
                @focus="focused = true"
                @blur="focused = false" />
        </div>
        <ul v-if="focused && !full && filtered.length"
            class="absolute top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-lg)]">
            <li v-for="s in filtered" :key="s" data-testid="tag-suggestion"
                class="cursor-pointer rounded-md px-2 py-1.5 font-mono text-[12.5px] text-foreground hover:bg-accent"
                @mousedown.prevent="add(s)">
                {{ s }}
            </li>
        </ul>
        <p v-if="error" role="alert" class="text-xs text-destructive-ink">{{ error }}</p>
    </div>
</template>
