<template>
    <span class="inline-flex items-center gap-1.5 font-medium" :class="status.tone">
        <component :is="status.icon" class="size-4 shrink-0" aria-hidden="true" />{{ status.label }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CalendarClock, Flag, Radio } from 'lucide-vue-next'
import type { ContestPhase } from '@/types/contest'

const props = defineProps<{ phase: ContestPhase }>()

// A status is text in an ink colour and one icon, never a filled chip.
const STATUS = {
    RUNNING: { label: 'Live', icon: Radio, tone: 'text-primary' },
    UPCOMING: { label: 'Upcoming', icon: CalendarClock, tone: 'text-ink-2' },
    ENDED: { label: 'Ended', icon: Flag, tone: 'text-muted-foreground' },
} as const

const status = computed(() => STATUS[props.phase])
</script>
