<template>
    <div class="flex flex-col gap-6">
        <PageHeader
            title="Problems"
            :description="description" />

        <div class="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_264px]">
            <section aria-label="Problem list" class="order-2 min-w-0 lg:order-none">
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
                        <div class="flex flex-col border-t border-rule-2" aria-busy="true">
                            <div v-for="n in 8" :key="n" class="flex h-13 items-center gap-4 border-b border-border">
                                <span class="sk w-full max-w-65" />
                                <span class="sk ml-auto w-16 shrink-0" />
                                <span class="sk hidden w-12 shrink-0 sm:block" />
                            </div>
                        </div>
                    </template>
                    <ProblemTable :problems="problems" />
                </ListStateShell>
                <!-- The last row already carries the rule, so the footer drops its own. Beside the rail the column is
                     640 px at lg, too narrow for text, pages and size on one line: the controls wrap under the text. -->
                <div class="[&>div]:mt-0 [&>div]:border-t-0 sm:[&>div]:flex-wrap [&_p]:whitespace-nowrap">
                    <PaginationFooter :pagination="pagination" @change-page="onPageChange" @update:size="onSizeChange" />
                </div>
            </section>

            <!-- The rail: a one-line tag row above the table under lg, a column beside it from lg up. -->
            <aside aria-label="Filters" class="order-1 flex min-w-0 flex-col gap-6 lg:order-none lg:gap-8 lg:border-l lg:border-border lg:pl-6">
                <TagCloud :selected="tag" @select="onTag" />
                <UpcomingContests />
            </aside>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { useSlashFocus } from '@/composables/useSlashFocus'
import SearchBar from '@/components/problem/SearchBar.vue'
import ProblemTable from '@/components/problem/ProblemTable.vue'
import TagCloud from '@/components/problem/TagCloud.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'
import { difficultyToHardness } from '@/types/problem'

// The sidebar's contests card loads on its own, so no contest code joins the /problems initial closure. It shows
// nothing until it has something to show anyway.
const UpcomingContests = defineAsyncComponent(() => import('@/components/contest/UpcomingContests.vue'))

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
    if (total === undefined) return `From your first loop to graphs and dynamic programming.`
    return `${total} ${total === 1 ? 'problem' : 'problems'}, ${tail}`
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

useSlashFocus(searchBar)

// Initial fetch
fetchProblems()
</script>
