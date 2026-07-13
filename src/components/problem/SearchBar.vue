<template>
    <div class="flex flex-col gap-6 border-b border-border p-6 lg:flex-row lg:items-center lg:justify-between">
        <!-- Title -->
        <h1 class="font-display text-3xl text-foreground">Problems</h1>

        <!-- Filters -->
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <!-- Difficulty Dropdown -->
            <Select :model-value="difficulty" @update:model-value="onDifficulty">
                <SelectTrigger class="w-[120px]">
                    <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
            </Select>

            <!-- Tags Switch -->
            <div class="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <Switch id="tags-mode" class="scale-90 data-[state=checked]:bg-primary"
                    :model-value="showTags" @update:model-value="onToggleTags" />
                <Label for="tags-mode" class="cursor-pointer text-sm font-medium text-muted-foreground">Tags</Label>
            </div>

            <!-- Keyword Input -->
            <div class="relative w-full lg:w-[280px]">
                <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input v-model="localSearch" placeholder="Search by title or ID…" class="pl-9" />
            </div>

            <!-- Refresh Button -->
            <Button variant="outline" size="icon" class="cursor-pointer" @click="$emit('refresh')">
                <RotateCw class="h-4 w-4" />
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, RotateCw } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
    search?: string
    difficulty?: string
    showTags?: boolean
}>(), {
    search: '',
    difficulty: 'all',
    showTags: false,
})

const emit = defineEmits<{
    (e: 'update:search', value: string): void
    (e: 'update:difficulty', value: string): void
    (e: 'update:showTags', value: boolean): void
    (e: 'refresh'): void
}>()

// Local mirror of the keyword so typing is smooth; emit is debounced.
const localSearch = ref(props.search)

// Keep local in sync if the parent resets search externally.
watch(() => props.search, (v) => {
    if (v !== localSearch.value) localSearch.value = v
})

watchDebounced(localSearch, (v) => emit('update:search', v), { debounce: 350 })

const onDifficulty = (value: unknown) => emit('update:difficulty', (value as string) ?? 'all')
const onToggleTags = (value: boolean) => emit('update:showTags', value)
</script>
