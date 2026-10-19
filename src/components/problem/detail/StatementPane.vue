<template>
    <Tabs v-model="tab" default-value="description" class="flex h-full min-h-0 flex-col gap-0 bg-card">
        <div class="flex-none border-b border-border px-3">
            <TabsList class="h-auto w-full justify-start gap-0.5 rounded-none bg-transparent p-0">
                <TabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">
                    <component :is="t.icon" aria-hidden="true" />
                    {{ t.label }}
                </TabsTrigger>
            </TabsList>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-[22px] pt-[18px] pb-7">
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
import { FileText, History } from 'lucide-vue-next'
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
    { value: 'description', label: 'Description', icon: FileText },
    { value: 'submissions', label: 'Submissions', icon: History },
]
</script>
