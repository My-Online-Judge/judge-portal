<template>
    <!-- Only the first read shows the skeleton: a background poll keeps the board as it is, with no refresh bar. -->
    <ListStateShell :loading="loading && !board" :error="error ? 'Check your connection and try again.' : null"
        :has-data="!!board" :empty="rows.length === 0 && labels.length === 0" :rows="5"
        empty-title="No one is on the scoreboard yet" :empty-hint="emptyHint" @retry="load">
        <template #skeleton>
            <div class="flex flex-col border-t border-rule-2" aria-busy="true">
                <div v-for="n in 5" :key="n" class="flex h-12 items-center gap-4 border-b border-border">
                    <span class="sk w-full" />
                </div>
            </div>
        </template>
        <!-- The rows sit 12 px outside the column so their text lines up with the page head. -->
        <div class="-mx-3">
            <Table>
                <caption class="sr-only">Scoreboard: solved problems first, then the lowest penalty in minutes</caption>
                <TableHeader>
                    <TableRow class="hover:bg-transparent">
                        <!-- Rank and Contestant stay in view while the problem columns scroll (phones, many problems). -->
                        <TableHead scope="col" class="sticky left-0 z-[1] w-16 min-w-16 bg-card">Rank</TableHead>
                        <TableHead scope="col" class="sticky left-16 z-[1] min-w-32 bg-card">Contestant</TableHead>
                        <TableHead scope="col" class="w-18 text-right">Solved</TableHead>
                        <TableHead scope="col" class="w-20 text-right">Penalty</TableHead>
                        <TableHead v-for="label in labels" :key="label" scope="col" class="w-16 min-w-16 text-center">{{ label }}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="rows.length === 0" class="hover:bg-transparent">
                        <TableCell :colspan="4 + labels.length" class="h-auto whitespace-normal py-8 text-center text-ink-2">
                            <template v-if="phase === 'UPCOMING'">{{ emptyHint }}</template>
                            <template v-else>
                                <span class="block font-medium text-foreground">No one is on the scoreboard yet</span>
                                <span class="mt-0.5 block text-sm">{{ emptyHint }}</span>
                            </template>
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="row in rows" :key="row.user.id" class="group">
                        <TableCell class="sticky left-0 z-[1] bg-card text-sm tabular-nums transition-colors group-hover:bg-muted motion-reduce:transition-none" data-col="rank">{{ row.rank }}</TableCell>
                        <TableCell class="sticky left-16 z-[1] whitespace-normal break-words bg-card transition-colors group-hover:bg-muted motion-reduce:transition-none" data-col="user">
                            <!-- The username, else the name (a Google account's username is its email address, which
                                 identity never shows), linked to the profile. -->
                            <RouterLink v-if="publicHandle(row.user.username) || row.user.name" :to="profilePath(row.user)"
                                class="font-medium text-foreground hover:text-primary hover:underline">{{ publicName(row.user) }}</RouterLink>
                            <!-- Identity did not know this user (or was down): the id's start tells rows apart. -->
                            <span v-else class="text-muted-foreground" :title="row.user.id">{{ publicName(row.user) }}</span>
                        </TableCell>
                        <TableCell class="text-right text-sm tabular-nums" data-col="solved">{{ row.solved }}</TableCell>
                        <TableCell class="text-right text-sm tabular-nums" data-col="penalty">{{ row.penalty }}</TableCell>
                        <TableCell v-for="label in labels" :key="label" :data-label="label"
                            class="text-center text-sm tabular-nums" :class="cellClass(row.problems[label])">
                            <template v-if="row.problems[label]?.solved">
                                <span aria-hidden="true" class="flex flex-col items-center leading-tight">
                                    <span class="text-sm font-semibold">{{ solvedMark(row.problems[label]!) }}</span>
                                    <span class="text-xs">{{ row.problems[label]!.minutes }}</span>
                                </span>
                                <span class="sr-only">{{ solvedText(row.problems[label]!) }}</span>
                            </template>
                            <template v-else-if="row.problems[label]?.attempts">
                                <span aria-hidden="true" class="text-sm font-semibold">-{{ row.problems[label]!.attempts }}</span>
                                <span class="sr-only">{{ tries(row.problems[label]!.attempts) }}, not solved</span>
                            </template>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </ListStateShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import axios from 'axios'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ListStateShell from '@/components/common/ListStateShell.vue'
import contestService from '@/services/contestService'
import { SCOREBOARD_POLL_MS } from '@/lib/contestTime'
import { profilePath, publicHandle, publicName } from '@/lib/publicName'
import type { ContestPhase, Scoreboard, ScoreboardCell } from '@/types/contest'

// Only a running contest's board changes: an upcoming or ended one is read once, and a phase change reads it again. A
// contest that ends while the board is open keeps polling for a 2 minute grace (verdicts judged just after the end still
// score), then the board is final. With `endsAt` the polling stops two minutes after the end (by the server's clock,
// through `offsetMs`) even when the page never learned that the phase changed.
const props = defineProps<{ slug: string; phase: ContestPhase; endsAt?: string; offsetMs?: number }>()

const board = shallowRef<Scoreboard | null>(null)
const loading = ref(false)
const error = ref(false)
const labels = computed(() => board.value?.labels ?? [])
const rows = computed(() => board.value?.rows ?? [])
const emptyHint = computed(() =>
    props.phase === 'UPCOMING'
        ? 'The scoreboard fills in once the contest starts.'
        : 'Contestants appear here once their first submission is judged.',
)

// ICPC marks: "+" (or "+2" after two wrong tries) over the minute of the accept; "-2" for two wrong tries so far.
const solvedMark = (c: ScoreboardCell) => (c.attempts > 1 ? `+${c.attempts - 1}` : '+')
const tries = (n: number) => (n === 1 ? '1 wrong try' : `${n} wrong tries`)
const solvedText = (c: ScoreboardCell) =>
    `Solved at minute ${c.minutes}` + (c.attempts > 1 ? ` after ${tries(c.attempts - 1)}` : '')
// Ink colour only: no filled cells.
const cellClass = (c?: ScoreboardCell) =>
    c?.solved ? 'text-success-ink' : c?.attempts ? 'text-destructive-ink' : ''

// Polled: read at mount, then again 15 s after each answer, so a slow answer never overlaps the next read. A hidden tab
// does not poll: it reads again when shown.
let timer: ReturnType<typeof setTimeout> | null = null
let inFlight: AbortController | null = null
let stopped = false
const hidden = () => document.visibilityState === 'hidden'
const GRACE_MS = 120_000
const GRACE_POLLS = GRACE_MS / SCOREBOARD_POLL_MS
let graceLeft = 0
const pastGrace = () => !!props.endsAt && Date.now() + (props.offsetMs ?? 0) >= Date.parse(props.endsAt) + GRACE_MS
const polls = () =>
    !stopped && !pastGrace() && (props.phase === 'RUNNING' || (props.phase === 'ENDED' && graceLeft > 0)) && !hidden()

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
            if (polls()) {
                if (props.phase === 'ENDED') graceLeft--
                timer = setTimeout(load, SCOREBOARD_POLL_MS)
            }
        }
    }
}

const onVisibilityChange = () => {
    if (hidden()) {
        if (timer !== null) clearTimeout(timer)
        timer = null
    } else if (polls() && timer === null && inFlight === null) {
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
watch(
    () => props.phase,
    (phase, before) => {
        graceLeft = before === 'RUNNING' && phase === 'ENDED' ? GRACE_POLLS : 0
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
