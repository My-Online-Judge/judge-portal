<template>
    <div class="flex h-full min-h-0 flex-col">
        <div class="min-h-0 flex-1">
            <ProblemSubmit :languages="languages || undefined" :problem-slug="slug" @success="onSubmit" />
        </div>
        <VerdictConsole :submission="latest" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import ProblemSubmit from './ProblemSubmit.vue'
import VerdictConsole from './VerdictConsole.vue'
import { useLanguageStore } from '@/stores/language'
import type { Submission } from '@/types/submission'

defineProps<{ slug: string }>()
const emit = defineEmits<{ (e: 'success', submission: Submission): void }>()

// This pane owns language loading: it fetches on mount, which is naturally lazy —
// the pane only mounts when the solve view is visible (always on desktop, on the
// Code toggle on mobile). The store caches, so the call is idempotent.
const languageStore = useLanguageStore()
const { languages } = storeToRefs(languageStore)
onMounted(() => languageStore.fetchLanguages())

// Latest submission drives the verdict console; also bubbled up so the
// Submissions tab can show it as a live pending row.
const latest = ref<Submission | null>(null)
const onSubmit = (submission: Submission) => {
    latest.value = submission
    emit('success', submission)
}
</script>
