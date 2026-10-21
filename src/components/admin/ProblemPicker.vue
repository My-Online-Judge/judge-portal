<template>
    <div class="flex flex-col gap-2">
        <div class="relative">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input v-model="query" type="search" placeholder="Search title or slug" class="pl-8" aria-label="Search problems" autocomplete="off" />
        </div>
        <div class="max-h-56 overflow-y-auto rounded-lg border border-border" :aria-busy="loading">
            <p v-if="failed" class="px-3 py-2.5 text-xs text-destructive-ink">Couldn't load problems. Change the search to try again.</p>
            <p v-else-if="loading && !items.length" class="px-3 py-2.5 text-xs text-muted-foreground">Searching</p>
            <p v-else-if="!items.length" class="px-3 py-2.5 text-xs text-muted-foreground">No problems match.</p>
            <ul v-else class="flex flex-col py-1" aria-label="Problems">
                <li v-for="p in items" :key="p.id">
                    <button
                        type="button"
                        class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        :class="p.problemSlug === modelValue && 'bg-primary-soft text-info-ink'"
                        :aria-pressed="p.problemSlug === modelValue"
                        @click="choose(p)"
                    >
                        <span class="min-w-0 truncate font-medium">{{ p.title }}</span>
                        <span class="slug shrink-0">{{ p.problemSlug }}</span>
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { watchDebounced } from '@vueuse/core'
import axios from 'axios'
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import problemService from '@/services/problemService'
import { ensureFreshSession } from '@/api/refreshSession'
import type { Problem } from '@/types/problem'

const props = withDefaults(defineProps<{ modelValue: string | null; excludeSlugs?: string[] }>(), {
    excludeSlugs: () => [],
})
// `pick` carries the whole problem, for callers that show its title.
const emit = defineEmits<{ 'update:modelValue': [slug: string]; pick: [problem: Problem] }>()

const PAGE_SIZE = 20

const query = ref('')
const results = shallowRef<Problem[]>([])
const loading = ref(false)
const failed = ref(false)
const items = computed(() => results.value.filter((p) => !props.excludeSlugs.includes(p.problemSlug)))

// The running search: a newer one aborts it.
let controller: AbortController | null = null

async function search() {
    controller?.abort()
    const ctl = new AbortController()
    controller = ctl
    loading.value = true
    failed.value = false
    try {
        // The list shows INACTIVE problems only to a valid token, and it answers an expired one as anonymous.
        await ensureFreshSession()
        const res = await problemService.getProblems(ctl.signal, { search: query.value.trim() || undefined, size: PAGE_SIZE })
        if (controller === ctl) results.value = res.data.data ?? []
    } catch (err) {
        if (controller === ctl && !axios.isCancel(err)) failed.value = true
    } finally {
        if (controller === ctl) {
            controller = null
            loading.value = false
        }
    }
}

function choose(p: Problem) {
    emit('update:modelValue', p.problemSlug)
    emit('pick', p)
}

watchDebounced(query, search, { debounce: 300 })
onMounted(search)
onBeforeUnmount(() => controller?.abort())
</script>
