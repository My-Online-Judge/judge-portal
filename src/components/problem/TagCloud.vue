<template>
    <!-- Under lg this is one row of tags with the heading in front; from lg up the heading sits over a list. -->
    <section class="flex min-w-0 items-center gap-3 lg:block">
        <h2 class="shrink-0 text-sm font-medium text-foreground lg:pb-2">Tags</h2>

        <ul v-if="tags.length" class="-m-1 flex min-w-0 list-none gap-0.5 overflow-x-auto p-1 [scrollbar-width:none] lg:m-0 lg:grid lg:overflow-visible lg:p-0 [&::-webkit-scrollbar]:hidden">
            <li v-for="t in tags" :key="t.tag" class="shrink-0 lg:shrink">
                <button type="button" class="flex h-8 w-full cursor-pointer items-center justify-between gap-3 whitespace-nowrap rounded-sm px-2 text-base text-ink-2 transition-colors sm:text-sm motion-reduce:transition-none hover:bg-muted aria-pressed:bg-primary-soft aria-pressed:font-medium aria-pressed:text-info-ink"
                    :aria-pressed="t.tag === selected" @click="emit('select', t.tag)">
                    <span class="flex items-center gap-1.5">
                        <Check v-if="t.tag === selected" class="size-3.5" aria-hidden="true" />
                        {{ t.tag }}
                    </span>
                    <span class="tabular-nums" :class="t.tag === selected ? 'text-info-ink' : 'text-muted-foreground'">{{ t.count }}</span>
                </button>
            </li>
        </ul>
        <p v-else class="text-sm text-muted-foreground">No tags yet.</p>
    </section>
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
