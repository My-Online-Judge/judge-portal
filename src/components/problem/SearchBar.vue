<template>
    <div ref="root" class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <div class="relative w-full sm:w-[280px]">
            <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input v-model="localSearch" type="search" placeholder="Search by title" aria-label="Search problems" class="pl-8" />
        </div>

        <div role="group" aria-label="Difficulty" class="inline-flex gap-0.5 rounded-lg border border-border bg-muted p-0.5">
            <button v-for="opt in options" :key="opt.value" type="button" :aria-pressed="difficulty === opt.value"
                class="cursor-pointer rounded-md px-2 py-[3px] text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-[var(--shadow-sm)]"
                @click="emit('update:difficulty', opt.value)">
                {{ opt.label }}
            </button>
        </div>

        <Badge v-if="tag" variant="primary" class="ml-1">
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
