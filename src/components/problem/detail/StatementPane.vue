<template>
    <Tabs v-model="tab" default-value="description" class="flex h-full min-h-0 flex-col gap-0">
        <TabsList class="w-full flex-none gap-6 px-6">
            <TabsTrigger v-for="t in tabs" :key="t.value" :value="t.value" class="px-0">
                {{ t.label }}
            </TabsTrigger>
        </TabsList>

        <div class="min-h-0 flex-1 overflow-y-auto p-6">
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
const tabs = [
    { value: 'description', label: 'Description' },
    { value: 'submissions', label: 'Submissions' },
]
</script>
