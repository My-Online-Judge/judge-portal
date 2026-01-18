<template>
    <div class="grid grid-cols-1 lg:grid-cols-[9.5fr_2.5fr] gap-6">
        <!-- Main Content (Left) -->
        <div>
            <div class="rounded-xl border bg-white shadow-sm">
                <SearchBar />
                <div class="px-6 pb-6">
                    <Loading v-if="isLoading" />
                    <div v-else-if="error" class="p-8 text-center text-red-500">Error loading problems</div>
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
import Loading from '@/components/common/Loading.vue'
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
