<template>
    <div class="animate-enter grid grid-cols-1 gap-6 lg:grid-cols-[9.5fr_2.5fr]">
        <!-- Main Content (Left) -->
        <div>
            <div class="rounded-xl border border-border bg-card">
                <SearchBar
                    :search="search"
                    :difficulty="difficulty"
                    :show-tags="showTags"
                    @update:search="onSearch"
                    @update:difficulty="onDifficulty"
                    @update:show-tags="showTags = $event"
                    @refresh="fetchProblems" />
                <div class="px-6 pb-6">
                    <div v-if="tag" class="pt-4">
                        <span class="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground">
                            Tag: {{ tag }}
                            <button type="button" class="opacity-80 hover:opacity-100" aria-label="Clear tag filter"
                                @click="onTag('')">
                                <X class="size-3" />
                            </button>
                        </span>
                    </div>
                    <ListStateShell
                        :loading="isLoading"
                        :error="error ? 'error' : null"
                        :has-data="!!response"
                        :empty="false"
                        @retry="fetchProblems"
                    >
                        <template #skeleton>
                            <div class="space-y-3 py-5">
                                <div v-for="n in 6" :key="n" class="flex items-center gap-4">
                                    <div class="h-4 w-6 shrink-0 animate-pulse rounded bg-muted"></div>
                                    <div class="h-4 w-full max-w-[220px] animate-pulse rounded bg-muted"></div>
                                    <div class="ml-auto h-5 w-14 shrink-0 animate-pulse rounded bg-muted"></div>
                                    <div class="h-4 w-20 shrink-0 animate-pulse rounded bg-muted"></div>
                                </div>
                            </div>
                        </template>
                        <ProblemTable :problems="problems" :show-tags="showTags" />
                    </ListStateShell>
                    <PaginationFooter :pagination="pagination" @change-page="onPageChange" @update:size="onSizeChange" />
                </div>
            </div>
        </div>

        <!-- Sidebar (Right) -->
        <aside class="space-y-6">
            <TagCloud :selected="tag" @select="onTag" />
            <Announcements />
        </aside>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
import SearchBar from '@/components/problem/SearchBar.vue'
import ProblemTable from '@/components/problem/ProblemTable.vue'
import TagCloud from '@/components/problem/TagCloud.vue'
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
const showTags = ref(false)
const tag = ref('')

const { data: response, isLoading, error, execute } = useFetch(problemService.getProblems, {
    immediate: false
})

const problems = computed(() => response.value?.data || [])
const pagination = computed(() => response.value?.pagination)

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

const onPageChange = (newPage: number) => {
    page.value = newPage
    fetchProblems()
}

const onSizeChange = (newSize: number) => {
    size.value = newSize
    page.value = 0
    fetchProblems()
}

// Initial fetch
fetchProblems()
</script>
