<template>
    <div class="rich-content" v-html="safe"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sanitizeHtml } from '@/lib/sanitize'
import { renderMath } from '@/lib/math'
import 'katex/dist/katex.min.css'

// Renders sanitized author HTML with the shared `.rich-content` typography
// (see main.css) so problem statements read the same as the tiptap editor.
const props = defineProps<{ html?: string | null }>()

const safe = computed(() => renderMath(sanitizeHtml(props.html)))
</script>
