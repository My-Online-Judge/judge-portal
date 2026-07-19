<template>
    <div class="rich-content" v-html="safe"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { sanitizeHtml } from '@/lib/sanitize'

// Renders sanitized author HTML with the shared `.rich-content` typography
// (see main.css) so problem statements read the same as the tiptap editor.
const props = defineProps<{ html?: string | null }>()

const safe = computed(() => sanitizeHtml(props.html))
</script>
