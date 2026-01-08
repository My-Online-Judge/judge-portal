<template>
    <div class="grid grid-cols-1 lg:grid-cols-[9.5fr_2.5fr] gap-6">
        <!-- Main Content (Left) -->
        <div>
            <div class="rounded-xl border bg-white shadow-sm">
                <SearchBar />
                <div class="px-6 pb-6">
                    <ProblemTable :problems="problems" />
                    <PaginationFooter />
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
import { ref } from 'vue'
import SearchBar from '@/components/problem/SearchBar.vue'
import ProblemTable from '@/components/problem/ProblemTable.vue'
import TagCloud from '@/components/problem/TagCloud.vue'
import PaginationFooter from '@/components/common/PaginationFooter.vue'
import Announcements from '@/components/common/Announcements.vue'

interface Problem {
    id: number
    title: string
    level: string
    total: number
    acRate: number
}

const problems = ref<Problem[]>([
    { id: 1, title: 'Simple A + B Problem', level: 'Easy', total: 9717, acRate: 47.9 },
    { id: 2, title: 'GZS and the Old English Dictionary', level: 'Hard', total: 519, acRate: 8.29 },
    { id: 3, title: 'GZS and Prime Number Method', level: 'Medium', total: 584, acRate: 8.56 },
    { id: 4, title: 'GZS delivers warmth', level: 'Medium', total: 633, acRate: 19.5 },
    { id: 5, title: 'GZS triangle', level: 'Easy', total: 261, acRate: 68.8 },
    { id: 6, title: 'GZS and String', level: 'Hard', total: 126, acRate: 24.6 },
    { id: 7, title: 'GZS and Small Park', level: 'Hard', total: 193, acRate: 28.5 },
    { id: 8, title: 'GZS Mushroom Picking', level: 'Medium', total: 102, acRate: 22.5 },
    { id: 9, title: 'LC and Prime', level: 'Medium', total: 121, acRate: 11.5 },
    { id: 10, title: 'Princess of LC and the Gama Empire', level: 'Medium', total: 101, acRate: 15.8 }
])
</script>
