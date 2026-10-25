<template>
    <div class="flex flex-col gap-3">
        <!-- Toolbar (contest enrollment design §5.3): the board's state and age on the left, finding people on the right. -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p class="inline-flex items-center gap-2 text-sm text-ink-2" data-test="board-status" aria-live="polite">
                <span v-if="phase === 'RUNNING'" aria-hidden="true"
                    class="size-2 rounded-full bg-primary motion-safe:animate-pulse" />
                <Flag v-else-if="phase === 'ENDED'" class="size-4" aria-hidden="true" />
                <CalendarClock v-else class="size-4" aria-hidden="true" />
                {{ statusText }}
            </p>
            <span class="flex-1" />
            <div class="relative w-full sm:w-56">
                <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input v-model="search" type="search" placeholder="Find a contestant" aria-label="Find a contestant" class="h-8 pl-8 text-sm" />
            </div>
            <Button v-if="viewerId" variant="ghost" size="sm" data-test="my-row" :disabled="!hasMyRow"
                :title="hasMyRow ? 'Scroll to your row' : 'You are not on this board'" @click="scrollToMine">
                <LocateFixed class="size-4" aria-hidden="true" />
                My row
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Refresh the scoreboard" :disabled="loading" @click="load">
                <RefreshCw class="size-4" :class="loading ? 'motion-safe:animate-spin' : ''" aria-hidden="true" />
            </Button>
        </div>

        <!-- Only the first read shows the skeleton: a background poll keeps the board as it is, with no refresh bar. -->
        <ListStateShell :loading="loading && !board" :error="error ? 'Check your connection and try again.' : null"
            :has-data="!!board" :empty="allRows.length === 0 && labels.length === 0" :rows="5"
            empty-title="No one is on the scoreboard yet" :empty-hint="emptyHint" @retry="load">
            <template #skeleton>
                <div class="flex flex-col border-t border-rule-2" aria-busy="true">
                    <div v-for="n in 5" :key="n" class="flex h-12 items-center gap-4 border-b border-border">
                        <span class="sk w-full" />
                    </div>
                </div>
            </template>

            <p v-if="allRows.length > 0" class="text-sm text-ink-2" data-test="board-summary">{{ summary }}</p>

            <!-- The rows sit 12 px outside the column so their text lines up with the page head. -->
            <div class="-mx-3">
                <Table>
                    <caption class="sr-only">Scoreboard: solved problems first, then the lowest penalty in minutes</caption>
                    <TableHeader class="sticky top-0 z-[2] bg-card">
                        <TableRow class="hover:bg-transparent">
                            <!-- Rank and Contestant stay in view while the problem columns scroll (phones, many problems). -->
                            <TableHead scope="col" class="sticky left-0 z-[1] w-16 min-w-16 bg-card">Rank</TableHead>
                            <TableHead scope="col" class="sticky left-16 z-[1] min-w-32 bg-card">Contestant</TableHead>
                            <TableHead scope="col" class="w-18 text-right">Solved</TableHead>
                            <TableHead scope="col" class="w-20 text-right">Penalty</TableHead>
                            <TableHead v-for="label in labels" :key="label" scope="col" class="w-16 min-w-16 text-center align-top">
                                <RouterLink v-if="canOpenProblems" :to="`${ROUTE_PATH.CONTESTS}/${slug}/problems/${label}`"
                                    class="font-semibold text-foreground hover:text-primary hover:underline">{{ label }}</RouterLink>
                                <span v-else class="font-semibold text-foreground">{{ label }}</span>
                                <span v-if="allRows.length > 0" class="block text-xs font-normal tabular-nums text-muted-foreground"
                                    :title="`${solvedCounts[label] ?? 0} solved`">{{ solvedCounts[label] ?? 0 }}</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-if="rows.length === 0" class="hover:bg-transparent">
                            <TableCell :colspan="4 + labels.length" class="h-auto whitespace-normal py-8 text-center text-ink-2">
                                <template v-if="allRows.length > 0">No contestant matches “{{ search.trim() }}”.</template>
                                <template v-else-if="phase === 'UPCOMING'">{{ emptyHint }}</template>
                                <template v-else>
                                    <span class="block font-medium text-foreground">No one is on the scoreboard yet</span>
                                    <span class="mt-0.5 block text-sm">{{ emptyHint }}</span>
                                </template>
                            </TableCell>
                        </TableRow>
                        <!-- h-16 on the pinned and problem cells fits a solved cell's two lines, so every row keeps one height and a
                             first accept does not push the rows below it down. A table cell's height is its minimum. -->
                        <TableRow v-for="row in rows" :key="row.user.id" :ref="(el) => rememberRow(row.user.id, el)"
                            :data-user="row.user.id" :aria-current="row.user.id === viewerId ? 'true' : undefined"
                            class="group" :class="row.user.id === viewerId ? 'bg-primary-soft hover:bg-primary-soft' : ''">
                            <TableCell class="sticky left-0 z-[1] h-16 text-sm tabular-nums transition-colors motion-reduce:transition-none"
                                :class="row.user.id === viewerId ? 'bg-primary-soft' : 'bg-card group-hover:bg-muted'" data-col="rank">
                                <span class="inline-flex items-center gap-1">
                                    <Medal v-if="isZero(row) ? false : row.rank <= 3" class="size-4" :class="MEDAL_INK[row.rank]" aria-hidden="true" />
                                    <span v-if="isZero(row)" :title="'Registered, nothing counted yet'">—</span>
                                    <span v-else>{{ row.rank }}</span>
                                </span>
                            </TableCell>
                            <TableCell class="sticky left-16 z-[1] h-16 whitespace-normal break-words transition-colors motion-reduce:transition-none"
                                :class="row.user.id === viewerId ? 'bg-primary-soft' : 'bg-card group-hover:bg-muted'" data-col="user">
                                <!-- The username, else the name (a Google account's username is its email address, which
                                     identity never shows), linked to the profile. -->
                                <RouterLink v-if="publicHandle(row.user.username) || row.user.name" :to="profilePath(row.user)"
                                    class="font-medium text-foreground hover:text-primary hover:underline">{{ publicName(row.user) }}</RouterLink>
                                <!-- Identity did not know this user (or was down): the id's start tells rows apart. -->
                                <span v-else class="text-muted-foreground" :title="row.user.id">{{ publicName(row.user) }}</span>
                                <span v-if="publicHandle(row.user.username) && row.user.name" class="block text-xs text-muted-foreground">{{ row.user.name }}</span>
                            </TableCell>
                            <TableCell class="text-right text-sm tabular-nums" data-col="solved">{{ row.solved }}</TableCell>
                            <TableCell class="text-right text-sm tabular-nums" data-col="penalty">{{ row.penalty }}</TableCell>
                            <TableCell v-for="label in labels" :key="label" :data-label="label"
                                :data-first="firstByLabel[label] === row.user.id ? 'true' : undefined"
                                class="h-16 text-center text-sm tabular-nums" :class="cellClass(row.problems[label], firstByLabel[label] === row.user.id)">
                                <template v-if="row.problems[label]?.solved">
                                    <span aria-hidden="true" class="flex flex-col items-center leading-tight">
                                        <span class="inline-flex items-center gap-0.5 text-sm font-semibold">
                                            <Star v-if="firstByLabel[label] === row.user.id" class="size-3 fill-current" aria-hidden="true" />{{ solvedMark(row.problems[label]!) }}
                                        </span>
                                        <span class="text-xs">{{ row.problems[label]!.minutes }}</span>
                                    </span>
                                    <span class="sr-only">{{ solvedText(row.problems[label]!) }}</span>
                                    <span v-if="firstByLabel[label] === row.user.id" class="sr-only">, first to solve</span>
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

            <p v-if="allRows.length > 0" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span class="inline-flex items-center gap-1"><Star class="size-3 fill-current text-success-ink" aria-hidden="true" />first to solve</span>
                <span><span class="font-semibold text-success-ink">+N</span> solved, N wrong tries before, time in minutes</span>
                <span><span class="font-semibold text-destructive-ink">-N</span> tried, not solved</span>
                <span>— registered, nothing counted yet</span>
            </p>
        </ListStateShell>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, type ComponentPublicInstance } from 'vue'
import axios from 'axios'
import { CalendarClock, Flag, LocateFixed, Medal, RefreshCw, Search, Star } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ListStateShell from '@/components/common/ListStateShell.vue'
import contestService from '@/services/contestService'
import { SCOREBOARD_POLL_MS } from '@/lib/contestTime'
import { profilePath, publicHandle, publicName } from '@/lib/publicName'
import { ROUTE_PATH } from '@/constants/routePath'
import type { ContestPhase, Scoreboard, ScoreboardCell, ScoreboardRow } from '@/types/contest'

const props = withDefaults(defineProps<{
    slug: string
    phase: ContestPhase
    endsAt?: string
    offsetMs?: number
    /** The signed-in viewer: their row is marked and "My row" scrolls to it. */
    viewerId?: string | null
    /** Whether the label heads link to the problems (the viewer may open them). */
    canOpenProblems?: boolean
}>(), { endsAt: undefined, offsetMs: 0, viewerId: null, canOpenProblems: false })

const board = shallowRef<Scoreboard | null>(null)
const loading = ref(false)
const error = ref(false)
const search = ref('')
/** When the board last landed, and a clock that ticks every second while shown (for "updated Ns ago"). */
const updatedAt = ref<number | null>(null)
const now = ref(Date.now())

const labels = computed(() => board.value?.labels ?? [])
const allRows = computed(() => board.value?.rows ?? [])
const rows = computed(() => {
    const needle = search.value.trim().toLowerCase()
    if (!needle) return allRows.value
    return allRows.value.filter((r) =>
        [r.user.username, r.user.name, publicName(r.user)].some((s) => s?.toLowerCase().includes(needle)))
})
const isZero = (row: ScoreboardRow) => row.solved === 0 && Object.keys(row.problems).length === 0
const MEDAL_INK: Record<number, string> = { 1: 'text-warning-ink', 2: 'text-muted-foreground', 3: 'text-ink-2' }

/** Per label: who solved it first (the lowest accept minute; ties go to the higher-ranked row, listed first). */
const firstByLabel = computed<Record<string, string>>(() => {
    const first: Record<string, { id: string; minutes: number }> = {}
    for (const row of allRows.value) {
        for (const [label, cell] of Object.entries(row.problems)) {
            if (!cell.solved || cell.minutes === null) continue
            const best = first[label]
            if (!best || cell.minutes < best.minutes) first[label] = { id: row.user.id, minutes: cell.minutes }
        }
    }
    return Object.fromEntries(Object.entries(first).map(([label, f]) => [label, f.id]))
})
const solvedCounts = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const row of allRows.value) {
        for (const [label, cell] of Object.entries(row.problems)) if (cell.solved) counts[label] = (counts[label] ?? 0) + 1
    }
    return counts
})
const summary = computed(() => {
    const n = allRows.value.length
    const solvers = allRows.value.filter((r) => r.solved > 0).length
    let earliest: { label: string; row: ScoreboardRow; minutes: number } | null = null
    for (const row of allRows.value) {
        for (const [label, cell] of Object.entries(row.problems)) {
            if (cell.solved && cell.minutes !== null && (!earliest || cell.minutes < earliest.minutes)) earliest = { label, row, minutes: cell.minutes }
        }
    }
    const parts = [`${n} ${n === 1 ? 'contestant' : 'contestants'}`, `${solvers} solved at least one`]
    if (earliest) parts.push(`first solve: ${earliest.label} by ${publicName(earliest.row.user)} at ${earliest.minutes}`)
    return parts.join(' · ')
})

const ageSeconds = computed(() => (updatedAt.value === null ? 0 : Math.max(0, Math.floor((now.value - updatedAt.value) / 1000))))
const statusText = computed(() => {
    if (props.phase === 'UPCOMING') return 'Opens at the start'
    if (props.phase === 'ENDED') return 'Final standings'
    return `Live · updated ${ageSeconds.value}s ago`
})
const emptyHint = computed(() =>
    props.phase === 'UPCOMING'
        ? 'The scoreboard fills in once the contest starts.'
        : 'Contestants appear here once their first submission is judged.',
)

const solvedMark = (c: ScoreboardCell) => (c.attempts > 1 ? `+${c.attempts - 1}` : '+')
const tries = (n: number) => (n === 1 ? '1 wrong try' : `${n} wrong tries`)
const solvedText = (c: ScoreboardCell) =>
    `Solved at minute ${c.minutes}` + (c.attempts > 1 ? ` after ${tries(c.attempts - 1)}` : '')
const cellClass = (c: ScoreboardCell | undefined, first: boolean) => {
    if (c?.solved) return first ? 'text-success-ink bg-[color-mix(in_oklch,var(--success-ink)_14%,transparent)]' : 'text-success-ink bg-[color-mix(in_oklch,var(--success-ink)_8%,transparent)]'
    return c?.attempts ? 'text-destructive-ink' : ''
}

// --- "My row": the viewer's row, scrolled into view on request ---
const rowEls = new Map<string, Element>()
const rememberRow = (id: string, el: Element | ComponentPublicInstance | null) => {
    const element = el && '$el' in (el as object) ? (el as ComponentPublicInstance).$el as Element : (el as Element | null)
    if (element) rowEls.set(id, element)
    else rowEls.delete(id)
}
const hasMyRow = computed(() => !!props.viewerId && allRows.value.some((r) => r.user.id === props.viewerId))
const scrollToMine = () => {
    if (!props.viewerId) return
    rowEls.get(props.viewerId)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

// --- Reading and polling (unchanged from before the redesign): 15 s while running, paused while hidden, a grace
// period after the end. ---
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
        updatedAt.value = Date.now()
        now.value = updatedAt.value
        error.value = false
    } catch (err) {
        if (inFlight !== ctl || axios.isCancel(err)) return
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

// The age ticks once a second while the component is shown (a setTimeout chain: the page's fake timers drive it).
let tick: ReturnType<typeof setTimeout> | null = null
const startTicking = () => {
    if (tick !== null) return
    const step = () => {
        now.value = Date.now()
        tick = stopped ? null : setTimeout(step, 1_000)
    }
    tick = setTimeout(step, 1_000)
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
    startTicking()
})
onBeforeUnmount(() => {
    stopped = true
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (timer !== null) clearTimeout(timer)
    if (tick !== null) clearTimeout(tick)
    inFlight?.abort()
})
</script>
