<template>
    <Tabs v-model="tab" default-value="description" class="flex h-full min-h-0 flex-col">
        <div class="border-b border-border px-3">
            <TabsList class="h-auto w-full justify-start gap-1 rounded-none bg-transparent p-0">
                <TabsTrigger value="description"
                    class="rounded-none border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">
                    Description
                </TabsTrigger>
                <TabsTrigger value="submissions"
                    class="rounded-none border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">
                    Submissions
                </TabsTrigger>
            </TabsList>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <TabsContent value="description" class="mt-0">
                <ProblemDescription :problem="problem" />
            </TabsContent>
            <TabsContent value="submissions" class="mt-0">
                <ProblemSubmissions :problem-slug="slug" :pending-submission="pendingSubmission"
                    @consumed="$emit('consumed')" />
            </TabsContent>
        </div>
    </Tabs>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProblemDescription from './ProblemDescription.vue'
import ProblemSubmissions from './ProblemSubmissions.vue'
import type { Problem } from '@/types/problem'
import type { Submission } from '@/types/submission'

defineProps<{
    problem: Problem
    slug: string
    pendingSubmission?: Submission | null
}>()

defineEmits<{ (e: 'consumed'): void }>()

const tab = ref('description')
</script>
