<template>
    <div class="rounded-xl border border-border bg-card p-6">
        <div class="mb-4 flex items-center justify-between">
            <h3 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</h3>
        </div>

        <div v-if="tags.length" class="flex flex-wrap gap-2">
            <button v-for="t in tags" :key="t.tag" type="button" :aria-pressed="t.tag === selected"
                class="cursor-pointer rounded-md px-3 py-1.5 text-xs transition-colors"
                :class="t.tag === selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'"
                @click="emit('select', t.tag)">
                {{ t.tag }} <span class="opacity-70">{{ t.count }}</span>
            </button>
        </div>
        <p v-else class="text-xs text-muted-foreground">No tags yet.</p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'
import type { TagCount } from '@/types/problem'
import type { ApiResponse } from '@/types/common'

defineProps<{ selected?: string }>()
const emit = defineEmits<{ (e: 'select', tag: string): void }>()

const { data } = useFetch<ApiResponse<TagCount[]>>(problemService.getTags)

// API returns count desc, tag asc; show the top 20.
const tags = computed(() => (data.value?.data ?? []).slice(0, 20))
</script>
