<template>
    <ListStateShell :loading="loading && !board" :error="error ? 'Check your connection and try again.' : null"
        :has-data="!!board" :empty="rows.length === 0" :rows="5" empty-title="No one is on the scoreboard yet"
        empty-hint="Contestants appear here once their first submission is judged." @retry="load">
        <div class="overflow-x-auto">
            <table class="dt" :style="{ minWidth: `${340 + labels.length * 64}px` }">
                <caption class="sr-only">Scoreboard: solved problems first, then the lowest penalty in minutes</caption>
                <thead>
                    <tr>
                        <th class="w-16 pl-4">Rank</th>
                        <th>Contestant</th>
                        <th class="num w-20">Solved</th>
                        <th class="num w-24">Penalty</th>
                        <th v-for="label in labels" :key="label" class="w-16 text-center font-mono">{{ label }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in rows" :key="row.user.id">
                        <td class="pl-4 font-mono tabular-nums" data-col="rank">{{ row.rank }}</td>
                        <td data-col="user">
                            <RouterLink v-if="row.user.username" :to="`/u/${encodeURIComponent(row.user.username)}`"
                                class="font-medium text-foreground hover:text-link hover:underline">{{ row.user.username }}</RouterLink>
                            <!-- Identity did not know this user (or was down): the id's start tells rows apart. -->
                            <span v-else class="font-mono text-xs text-muted-foreground" :title="row.user.id">{{ row.user.id.slice(0, 8) }}</span>
                        </td>
                        <td class="num" data-col="solved">{{ row.solved }}</td>
                        <td class="num" data-col="penalty">{{ row.penalty }}</td>
                        <td v-for="label in labels" :key="label" :data-label="label"
                            class="text-center font-mono tabular-nums" :class="cellClass(row.problems[label])">
                            <template v-if="row.problems[label]?.solved">
                                <span aria-hidden="true" class="flex flex-col items-center leading-tight">
                                    <span class="text-[13px] font-semibold">{{ solvedMark(row.problems[label]!) }}</span>
                                    <span class="text-[11px]">{{ row.problems[label]!.minutes }}</span>
                                </span>
                                <span class="sr-only">{{ solvedText(row.problems[label]!) }}</span>
                            </template>
                            <template v-else-if="row.problems[label]?.attempts">
                                <span aria-hidden="true" class="text-[13px] font-semibold">-{{ row.problems[label]!.attempts }}</span>
                                <span class="sr-only">{{ tries(row.problems[label]!.attempts) }}, not solved</span>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </ListStateShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import axios from 'axios'
import ListStateShell from '@/components/common/ListStateShell.vue'
import contestService from '@/services/contestService'
import { SCOREBOARD_POLL_MS } from '@/lib/contestTime'
import type { Scoreboard, ScoreboardCell } from '@/types/contest'

const props = defineProps<{ slug: string }>()

const board = shallowRef<Scoreboard | null>(null)
const loading = ref(false)
const error = ref(false)
const labels = computed(() => board.value?.labels ?? [])
const rows = computed(() => board.value?.rows ?? [])

// ICPC marks: "+" (or "+2" after two wrong tries) over the minute of the accept; "-2" for two wrong tries so far.
const solvedMark = (c: ScoreboardCell) => (c.attempts > 1 ? `+${c.attempts - 1}` : '+')
const tries = (n: number) => (n === 1 ? '1 wrong try' : `${n} wrong tries`)
const solvedText = (c: ScoreboardCell) =>
    `Solved at minute ${c.minutes}` + (c.attempts > 1 ? ` after ${tries(c.attempts - 1)}` : '')
const cellClass = (c?: ScoreboardCell) =>
    c?.solved ? 'bg-success-soft text-success-ink' : c?.attempts ? 'text-destructive-ink' : ''

// Polled: read at mount, then again 15 s after each answer, so a slow answer never overlaps the next read. A hidden tab
// does not poll: it reads again when shown.
let timer: ReturnType<typeof setTimeout> | null = null
let inFlight: AbortController | null = null
let stopped = false
const hidden = () => document.visibilityState === 'hidden'

const load = async () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    inFlight?.abort()
    const ctl = new AbortController()
    inFlight = ctl
    loading.value = true
    try {
        const res = await contestService.scoreboard(ctl.signal, props.slug)
        if (inFlight !== ctl) return
        board.value = res.data.data
        error.value = false
    } catch (err) {
        if (inFlight !== ctl || axios.isCancel(err)) return
        // The last standings stay on screen; the shell says the refresh failed.
        error.value = true
    } finally {
        if (inFlight === ctl) {
            inFlight = null
            loading.value = false
            if (!stopped && !hidden()) timer = setTimeout(load, SCOREBOARD_POLL_MS)
        }
    }
}

const onVisibilityChange = () => {
    if (hidden()) {
        if (timer !== null) clearTimeout(timer)
        timer = null
    } else if (!stopped && timer === null && inFlight === null) {
        void load()
    }
}

watch(
    () => props.slug,
    () => {
        board.value = null
        void load()
    },
)
onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    void load()
})
onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stopped = true
    if (timer !== null) clearTimeout(timer)
    inFlight?.abort()
})
</script>
