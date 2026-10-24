<template>
    <div ref="root" class="flex flex-wrap items-center gap-3 pb-4">
        <div class="relative w-full sm:w-75">
            <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input v-model="localSearch" type="search" placeholder="Search by title or slug" aria-label="Search problems" class="pl-8 pr-9" />
            <!-- The key hint gives way to the browser's own clear button once there is something to clear. -->
            <kbd v-if="!localSearch" aria-hidden="true"
                class="pointer-events-none absolute right-2 top-1/2 inline-flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-sm border border-rule-2 bg-background px-1 font-mono text-xs text-ink-2">/</kbd>
        </div>

        <div role="group" aria-label="Difficulty" class="inline-flex gap-0.5 rounded-md border border-rule-2 p-0.5">
            <button v-for="opt in options" :key="opt.value" type="button" :aria-pressed="difficulty === opt.value"
                class="relative h-7.5 cursor-pointer rounded-sm px-3 text-base font-medium text-ink-2 sm:text-sm transition-colors motion-reduce:transition-none after:absolute after:inset-x-0 after:-inset-y-1.75 hover:bg-muted aria-pressed:bg-primary-soft aria-pressed:text-info-ink"
                @click="emit('update:difficulty', opt.value)">
                {{ opt.label }}
            </button>
        </div>

        <Badge v-if="tag" variant="primary">
            {{ tag }}
            <button type="button" class="cursor-pointer rounded-sm opacity-80 hover:opacity-100" :aria-label="`Remove tag filter ${tag}`"
                @click="emit('clear-tag')">
                <X class="size-3" />
            </button>
        </Badge>

        <Button v-if="filtered" variant="ghost" size="sm" class="ml-auto" @click="emit('clear-filters')">Clear filters</Button>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { Search, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const props = withDefaults(defineProps<{
    search?: string
    difficulty?: string
    tag?: string
    filtered?: boolean
}>(), {
    search: '',
    difficulty: 'all',
    tag: '',
    filtered: false,
})

const emit = defineEmits<{
    (e: 'update:search', value: string): void
    (e: 'update:difficulty', value: string): void
    (e: 'clear-tag'): void
    (e: 'clear-filters'): void
}>()

const options = [
    { value: 'all', label: 'All' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
]

const root = ref<HTMLElement | null>(null)

// Local mirror of the keyword so typing is smooth; emit is debounced.
const localSearch = ref(props.search)

// Keep local in sync if the parent resets search externally.
watch(() => props.search, (v) => {
    if (v !== localSearch.value) localSearch.value = v
})

watchDebounced(localSearch, (v) => emit('update:search', String(v)), { debounce: 250 })

defineExpose({
    focus: () => root.value?.querySelector<HTMLInputElement>('input')?.focus(),
})
</script>
