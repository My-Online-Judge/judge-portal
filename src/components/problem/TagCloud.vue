<template>
    <div class="rounded-xl border border-border bg-card p-4">
        <div class="mb-3 flex items-center justify-between">
            <h3 class="text-[13.5px] font-semibold text-foreground">Tags</h3>
        </div>

        <div v-if="tags.length" class="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            <button v-for="t in tags" :key="t.tag" type="button" :aria-pressed="t.tag === selected"
                class="inline-flex h-[26px] shrink-0 cursor-pointer items-center gap-[5px] whitespace-nowrap rounded-md border px-[9px] font-mono text-[12.5px] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                :class="t.tag === selected
                    ? 'border-primary/45 bg-primary-soft text-info-ink'
                    : 'border-border bg-card text-foreground hover:border-input hover:bg-muted'"
                @click="emit('select', t.tag)">
                <Check v-if="t.tag === selected" class="size-3" aria-hidden="true" />
                {{ t.tag }}
                <span class="text-[11px]" :class="t.tag === selected ? 'text-info-ink' : 'text-muted-foreground'">{{ t.count }}</span>
            </button>
        </div>
        <p v-else class="text-xs text-muted-foreground">No tags yet.</p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
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
