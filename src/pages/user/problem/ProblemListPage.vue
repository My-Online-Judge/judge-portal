<template>
    <div class="animate-enter grid grid-cols-1 gap-6 lg:grid-cols-[9.5fr_2.5fr]">
        <!-- Main Content (Left) -->
        <div>
            <div class="rounded-xl border border-border bg-card">
                <SearchBar />
                <div class="px-6 pb-6">
                    <div v-if="isLoading" class="space-y-3 py-5">
                        <div v-for="n in 6" :key="n" class="flex items-center gap-4">
                            <div class="h-4 w-6 shrink-0 animate-pulse rounded bg-muted"></div>
                            <div class="h-4 w-full max-w-[220px] animate-pulse rounded bg-muted"></div>
                            <div class="ml-auto h-5 w-14 shrink-0 animate-pulse rounded bg-muted"></div>
                            <div class="h-4 w-20 shrink-0 animate-pulse rounded bg-muted"></div>
                        </div>
                    </div>
                    <div v-else-if="error" class="p-8 text-center text-destructive">Couldn't load problems. Please try again.</div>
                    <ProblemTable v-else :problems="problems" />
                    <PaginationFooter :pagination="pagination" @change-page="onPageChange" @update:size="onSizeChange" />
                </div>
            </div>
        </div>

        <!-- Sidebar (Right) -->
        <aside class="space-y-6">
            <TagCloud />
            <Announcements />
        </aside>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SearchBar from '@/components/problem/SearchBar.vue'
import ProblemTable from '@/components/problem/ProblemTable.vue'
import TagCloud from '@/components/problem/TagCloud.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import Announcements from '@/components/common/Announcements.vue'
import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'

const page = ref(0)
const size = ref(10)
const search = ref('')

const { data: response, isLoading, error, execute } = useFetch(problemService.getProblems, {
    immediate: false
})

const problems = computed(() => response.value?.data || [])
const pagination = computed(() => response.value?.pagination)

const fetchProblems = () => {
    execute({
        page: page.value,
        size: size.value,
        search: search.value || undefined
    })
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
