<template>
    <div class="space-y-6">
        <div v-if="isLoading" class="flex justify-center py-20">
            <Loading />
        </div>

        <div v-else-if="error" class="text-center py-20 text-red-500">
            Error loading problem details.
        </div>

        <Tabs v-else-if="problem" v-model="activeTab" default-value="description" class="w-full">
            <Card>
                <CardHeader class="px-6 pb-0 space-y-4 border-b">
                    <!-- Header Info -->
                    <ProblemHeader :problem="problem" />

                    <!-- Tabs Navigation -->
                    <TabsList class="w-full justify-start rounded-none bg-transparent p-0 -mb-px">
                        <TabsTrigger value="description"
                            class="rounded-none border-b-2 border-transparent px-4 py-2 text-slate-600 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none">
                            Problem
                        </TabsTrigger>
                        <TabsTrigger value="submit"
                            class="rounded-none border-b-2 border-transparent px-4 py-2 text-slate-600 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none">
                            Submit
                        </TabsTrigger>
                        <TabsTrigger value="submissions"
                            class="rounded-none border-b-2 border-transparent px-4 py-2 text-slate-600 hover:text-slate-900 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none">
                            Submissions
                        </TabsTrigger>
                    </TabsList>
                </CardHeader>

                <CardContent>
                    <div class="grid gap-6" :class="activeTab === 'submissions' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[10fr_2fr]'
                        ">
                        <!-- Left Column -->
                        <div>
                            <!-- Tab: Description -->
                            <TabsContent value="description" class="space-y-6 mt-0">
                                <ProblemDescription :problem="problem" />
                            </TabsContent>

                            <!-- Tab: Submit -->
                            <TabsContent value="submit" class="mt-0">
                                <ProblemSubmit :languages="languages || undefined" :problem-slug="slug" @success="handleSubmissionSuccess" />
                            </TabsContent>

                            <!-- Tab: Submissions -->
                            <TabsContent value="submissions" class="mt-0">
                                <ProblemSubmissions :problem-slug="slug" />
                            </TabsContent>
                        </div>

                        <!-- Sidebar -->
                        <div :class="{ hidden: activeTab === 'submissions' }">
                            <ProblemSidebar :problem="problem" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Tabs>
    </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import ProblemHeader from '@/components/problem/detail/ProblemHeader.vue'
import ProblemDescription from '@/components/problem/detail/ProblemDescription.vue'
import ProblemSubmit from '@/components/problem/detail/ProblemSubmit.vue'
import ProblemSubmissions from '@/components/problem/detail/ProblemSubmissions.vue'
import ProblemSidebar from '@/components/problem/detail/ProblemSidebar.vue'
import Loading from '@/components/common/Loading.vue'

import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'
import { useLanguageStore } from '@/stores/language'
import { storeToRefs } from 'pinia'

const route = useRoute()
const slug = route.params.slug as string
const activeTab = ref('description')

const {
    data: problem,
    isLoading,
    error,
    execute: fetchProblem,
} = useFetch(problemService.getProblemBySlug, {
    params: slug,
    transform: (res) => res.data,
})

const languageStore = useLanguageStore()
const { languages } = storeToRefs(languageStore)

languageStore.fetchLanguages()

const handleSubmissionSuccess = () => {
    activeTab.value = 'submissions'
    fetchProblem(slug)
}
</script>
