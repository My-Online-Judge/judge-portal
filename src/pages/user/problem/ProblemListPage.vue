<template>
    <div class="animate-enter flex flex-col gap-[18px]">
        <PageHeader
            title="Problems"
            :description="description" />

        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_264px]">
            <div class="order-2 min-w-0 overflow-hidden rounded-xl border border-border bg-card lg:order-none lg:row-span-2">
                <SearchBar
                    ref="searchBar"
                    :search="search"
                    :difficulty="difficulty"
                    :tag="tag"
                    :filtered="isFiltered"
                    @update:search="onSearch"
                    @update:difficulty="onDifficulty"
                    @clear-tag="onTag('')"
                    @clear-filters="clearFilters" />
                <ListStateShell
                    :loading="isLoading"
                    :error="error ? 'error' : null"
                    :has-data="!!response"
                    :empty="problems.length === 0"
                    :filtered="isFiltered"
                    :filter-summary="filterSummary"
                    empty-title="No problems yet"
                    empty-hint="Problems appear here once an admin publishes them."
                    @retry="fetchProblems"
                    @clear-filters="clearFilters"
                >
                    <template #skeleton>
                        <div class="flex flex-col" aria-busy="true">
                            <div v-for="n in 8" :key="n" class="flex h-[52px] items-center gap-4 border-b border-border px-4 last:border-b-0">
                                <span class="sk w-full max-w-[260px]" />
                                <span class="sk ml-auto w-16 shrink-0" />
                                <span class="sk hidden w-12 shrink-0 sm:block" />
                            </div>
                        </div>
                    </template>
                    <ProblemTable :problems="problems" />
                </ListStateShell>
                <div class="px-4">
                    <PaginationFooter :pagination="pagination" @change-page="onPageChange" @update:size="onSizeChange" />
                </div>
            </div>

            <div class="order-1 min-w-0 lg:order-none">
                <TagCloud :selected="tag" @select="onTag" />
            </div>
            <div class="order-3 min-w-0 lg:order-none">
                <Announcements />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEventListener } from '@vueuse/core'
import SearchBar from '@/components/problem/SearchBar.vue'
import ProblemTable from '@/components/problem/ProblemTable.vue'
import TagCloud from '@/components/problem/TagCloud.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import Announcements from '@/components/common/Announcements.vue'
import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'
import { difficultyToHardness } from '@/types/problem'

const page = ref(0)
const size = ref(10)
const search = ref('')
const difficulty = ref('all')
const tag = ref('')
const searchBar = ref<InstanceType<typeof SearchBar> | null>(null)

const { data: response, isLoading, error, execute } = useFetch(problemService.getProblems, {
    immediate: false
})

const problems = computed(() => response.value?.data || [])
const pagination = computed(() => response.value?.pagination)

const description = computed(() => {
    const total = pagination.value?.totalElements
    const tail = 'from your first loop to graphs and dynamic programming.'
    return total === undefined ? `From your first loop to graphs and dynamic programming.` : `${total} problems, ${tail}`
})

const isFiltered = computed(() => !!search.value || difficulty.value !== 'all' || !!tag.value)
const filterSummary = computed(() => {
    const parts: string[] = []
    if (search.value) parts.push(search.value)
    if (difficulty.value !== 'all') parts.push(difficulty.value.charAt(0).toUpperCase() + difficulty.value.slice(1))
    if (tag.value) parts.push(tag.value)
    return parts.join(', ')
})

const fetchProblems = () => {
    execute({
        page: page.value,
        size: size.value,
        search: search.value || undefined,
        hardnessLevel: difficultyToHardness(difficulty.value),
        tag: tag.value || undefined
    })
}

// Any filter change resets to the first page.
const onSearch = (value: string) => {
    if (value === search.value) return
    search.value = value
    page.value = 0
    fetchProblems()
}

const onDifficulty = (value: string) => {
    difficulty.value = value
    page.value = 0
    fetchProblems()
}

// Clicking the active tag again clears it.
const onTag = (value: string) => {
    tag.value = value === tag.value ? '' : value
    page.value = 0
    fetchProblems()
}

const clearFilters = () => {
    search.value = ''
    difficulty.value = 'all'
    tag.value = ''
    page.value = 0
    fetchProblems()
}

const onPageChange = (newPage: number) => {
    page.value = newPage
    fetchProblems()
}

const onSizeChange = (newSize: number) => {
    size.value = newSize
    page.value = 0
    fetchProblems()
}

// "/" jumps to the search field unless the user is already typing somewhere.
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
    const el = e.target as HTMLElement | null
    if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
    e.preventDefault()
    searchBar.value?.focus()
})

// Initial fetch
fetchProblems()
</script>
