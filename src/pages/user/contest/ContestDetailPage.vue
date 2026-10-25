<template>
    <div class="flex flex-col gap-6">
        <Loading v-if="state === 'loading'" />

        <div v-else-if="state === 'notFound'" class="flex flex-col items-center gap-3 py-20 text-center" role="alert">
            <h1 class="font-display text-2xl text-foreground">Contest not found</h1>
            <p class="text-base text-ink-2">It may not be published yet, or the link is wrong.</p>
            <RouterLink :to="ROUTE_PATH.CONTESTS" class="text-sm font-medium text-link hover:underline">All contests</RouterLink>
        </div>

        <div v-else-if="state === 'error'" class="flex flex-col items-center gap-3 py-20 text-center" role="alert">
            <h1 class="font-display text-2xl text-foreground">Could not load this contest</h1>
            <Button variant="outline" size="sm" @click="load()">Retry</Button>
        </div>

        <template v-else-if="contest">
            <!-- Page head (contest enrollment design §5.2): back link, title, status + countdown, then the facts as an
                 inline list, then the one action the viewer has right now. -->
            <div class="flex flex-col gap-3">
                <RouterLink :to="ROUTE_PATH.CONTESTS"
                    class="relative inline-flex items-center gap-1 self-start rounded-sm text-sm text-ink-2 transition-colors motion-reduce:transition-none after:absolute after:inset-x-0 after:-inset-y-3 hover:text-primary">
                    <ChevronLeft class="size-4" aria-hidden="true" /> Contests
                </RouterLink>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h1 class="font-display text-2xl break-words text-foreground">{{ contest.title }}</h1>
                    <Badge v-if="contest.status === 'DRAFT'" variant="neutral">Draft</Badge>
                </div>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <ContestStatus :phase="contest.phase" />
                    <!-- 16 px against the 14 px of its neighbours: keep the label on the same baseline. -->
                    <span v-if="contest.phase !== 'ENDED'" class="inline-flex items-baseline gap-1.5 text-ink-2">
                        {{ contest.phase === 'UPCOMING' ? 'Starts in' : 'Ends in' }}
                        <ContestCountdown :target="contest.phase === 'UPCOMING' ? contest.startsAt : contest.endsAt"
                            :offset-ms="offsetMs" class="text-foreground" @elapsed="onElapsed()" />
                    </span>
                </div>
                <dl class="meta-dl">
                    <div>
                        <dt>Start</dt>
                        <dd>{{ formatContestDate(contest.startsAt) }}</dd>
                    </div>
                    <div>
                        <dt>End</dt>
                        <dd>{{ formatContestDate(contest.endsAt) }}</dd>
                    </div>
                    <div>
                        <dt>Duration</dt>
                        <dd>{{ formatDuration(Date.parse(contest.endsAt) - Date.parse(contest.startsAt)) }}</dd>
                    </div>
                    <div>
                        <dt>Format</dt>
                        <dd>ICPC: solved, then penalty</dd>
                    </div>
                    <div>
                        <dt>Registration</dt>
                        <dd data-test="registration">{{ registrationText }}</dd>
                    </div>
                    <div>
                        <dt>Problems</dt>
                        <dd>{{ contest.problems.length || contest.phase === 'UPCOMING' ? problemCountText : '-' }}</dd>
                    </div>
                </dl>
                <div class="flex flex-wrap items-center gap-3">
                    <EnrollmentAction :contest="contest" primary @changed="onChanged" />
                    <!-- Registration stays open while a required contest runs: the clock does not wait for late joiners. -->
                    <span v-if="contest.enrollment === 'REQUIRED' && contest.phase === 'RUNNING' && !contest.enrolled"
                        class="text-sm text-ink-2">Registration is still open; the clock started at the start time.</span>
                </div>
            </div>

            <Tabs v-model="tab">
                <!-- The tab row reaches 12 px into the gutter, as the tables do, so the first label lines up with the head. -->
                <div class="-mx-3">
                    <TabsList class="w-full">
                        <TabsTrigger value="overview"><Info aria-hidden="true" />Overview</TabsTrigger>
                        <TabsTrigger value="problems"><ListChecks aria-hidden="true" />Problems</TabsTrigger>
                        <TabsTrigger value="standings"><Trophy aria-hidden="true" />Standings</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" class="mt-4">
                    <div class="flex flex-col gap-5">
                        <p v-if="contest.description" class="max-w-[64ch] text-base whitespace-pre-line text-ink-2">{{ contest.description }}</p>
                        <p v-else class="text-base text-ink-2">The organisers have not written a description.</p>
                        <section aria-labelledby="contest-know" class="flex flex-col gap-1.5">
                            <h2 id="contest-know" class="text-sm font-semibold text-foreground">What you need to know</h2>
                            <ul class="flex max-w-[64ch] flex-col gap-1 text-sm text-ink-2">
                                <li>{{ kindLine }}</li>
                                <li>ICPC rules: contestants are ranked by problems solved, then by penalty time: minutes from the start to each accepted solution, plus 20 per wrong try before it.</li>
                                <li>{{ timingLine }}</li>
                            </ul>
                        </section>
                    </div>
                </TabsContent>

                <TabsContent value="problems" class="mt-4">
                    <!-- Nothing to list: say why (upcoming, not registered, or truly empty), in one centred line. -->
                    <div v-if="contest.problems.length === 0" class="flex flex-col items-center gap-3 py-10 text-center" data-test="problems-empty">
                        <p class="text-base text-ink-2">{{ problemsEmptyText }}</p>
                        <EnrollmentAction v-if="mustRegister" :contest="contest" @changed="onChanged" />
                    </div>
                    <div v-else class="-mx-3">
                        <Table>
                            <TableHeader>
                                <TableRow class="hover:bg-transparent">
                                    <TableHead scope="col" class="w-20">Problem</TableHead>
                                    <TableHead scope="col">Title</TableHead>
                                    <TableHead v-if="authStore.user" scope="col" class="w-24">My status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-for="p in contest.problems" :key="p.label">
                                    <TableCell class="font-medium">{{ p.label }}</TableCell>
                                    <TableCell class="whitespace-normal break-words">
                                        <RouterLink v-if="contest.phase !== 'UPCOMING'"
                                            :to="`${ROUTE_PATH.CONTESTS}/${contest.slug}/problems/${p.label}`"
                                            class="text-base font-medium text-foreground hover:text-primary hover:underline">{{ p.title }}</RouterLink>
                                        <span v-else class="text-base font-medium text-foreground">{{ p.title }}</span>
                                    </TableCell>
                                    <TableCell v-if="authStore.user">
                                        <span v-if="contest.myProgress[p.label]?.solved" class="inline-flex items-center text-success-ink">
                                            <Check class="size-4" aria-hidden="true" />
                                            <span class="sr-only">Solved</span>
                                        </span>
                                        <span v-else-if="contest.myProgress[p.label]?.attempts" class="text-sm tabular-nums text-ink-2">
                                            {{ tries(contest.myProgress[p.label]!.attempts) }}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="standings" class="mt-4">
                    <!-- Mounted only while shown: it polls every 15 s while the contest runs. -->
                    <ContestScoreboard v-if="tab === 'standings'" :slug="contest.slug" :phase="contest.phase"
                        :ends-at="contest.endsAt" :offset-ms="offsetMs" :viewer-id="authStore.user?.id ?? null"
                        :can-open-problems="contest.problems.length > 0 && contest.phase !== 'UPCOMING'" />
                </TabsContent>
            </Tabs>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import { Check, ChevronLeft, Info, ListChecks, Trophy } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Loading from '@/components/common/Loading.vue'
import ContestCountdown from '@/components/contest/ContestCountdown.vue'
import ContestStatus from '@/components/contest/ContestStatus.vue'
import ContestScoreboard from '@/components/contest/ContestScoreboard.vue'
import EnrollmentAction from '@/components/contest/EnrollmentAction.vue'
import contestService from '@/services/contestService'
import { ensureFreshSession } from '@/api/refreshSession'
import { useAuthStore } from '@/stores/auth'
import { formatContestDate, formatDuration, serverOffsetMs } from '@/lib/contestTime'
import { ROUTE_PATH } from '@/constants/routePath'
import type { ContestDetail } from '@/types/contest'

const RESERVED_SLUG = 'all'
type Tab = 'overview' | 'problems' | 'standings'

const route = useRoute()
const authStore = useAuthStore()
const slug = computed(() => String(route.params.slug ?? ''))
/** `?tab=standings` (the list's "Standings" link) opens that tab; anything else opens the problems. */
const initialTab = (): Tab => (route.query?.tab === 'standings' ? 'standings' : 'problems')

const state = ref<'loading' | 'ready' | 'notFound' | 'error'>('loading')
const contest = shallowRef<ContestDetail | null>(null)
const offsetMs = ref(0)
const tab = ref<Tab>(initialTab())

const tries = (n: number) => (n === 1 ? '1 try' : `${n} tries`)
const registered = (n: number) => (n === 1 ? '1 registered' : `${n} registered`)

const registrationText = computed(() => {
    const c = contest.value
    if (!c) return ''
    return c.enrollment === 'REQUIRED' ? `Required, ${registered(c.enrolledCount)}` : 'Open to everyone'
})
const problemCountText = computed(() => {
    const n = contest.value?.problems.length ?? 0
    return n === 1 ? '1 problem' : `${n} problems`
})
/** A required contest that runs, seen by someone who is not in: the problems stay hidden until they register. */
const mustRegister = computed(() => {
    const c = contest.value
    return !!c && c.enrollment === 'REQUIRED' && c.phase === 'RUNNING' && !c.enrolled
})
const problemsEmptyText = computed(() => {
    const c = contest.value
    if (!c) return ''
    if (c.phase === 'UPCOMING') return 'Problems appear when the contest starts.'
    if (mustRegister.value) return 'Register to see the problems.'
    return 'This contest has no problems.'
})
const kindLine = computed(() => {
    const c = contest.value
    if (!c) return ''
    return c.enrollment === 'REQUIRED'
        ? 'Registration required: register before or during the contest to see the problems and submit. You can withdraw until it starts.'
        : 'Open to everyone: any signed-in user can see the problems and submit while it runs.'
})
const timingLine = computed(() => {
    const c = contest.value
    if (!c) return ''
    const length = formatDuration(Date.parse(c.endsAt) - Date.parse(c.startsAt))
    return `It runs for ${length}, from ${formatContestDate(c.startsAt)} to ${formatContestDate(c.endsAt)}. After the end the problems stay open for practice.`
})

let seq = 0
let inFlight: AbortController | null = null
let viewer: string | null | undefined

/** `quiet` keeps the page as it is while reading (a countdown ended, or the user changed). True when the read landed. */
const load = async ({ quiet = false } = {}): Promise<boolean> => {
    const mine = ++seq
    inFlight?.abort()
    if (slug.value === RESERVED_SLUG) {
        inFlight = null
        state.value = 'notFound'
        return false
    }
    const ctl = new AbortController()
    inFlight = ctl
    if (!quiet || !contest.value) state.value = 'loading'
    try {
        await authStore.ensureLoaded()
        if (mine !== seq) return false
        viewer = authStore.user?.id ?? null
        if (authStore.user) await ensureFreshSession()
        if (mine !== seq) return false
        const res = await contestService.get(ctl.signal, slug.value)
        if (mine !== seq) return false
        contest.value = res.data.data
        offsetMs.value = serverOffsetMs(res.data.data.serverTime, Date.now())
        state.value = 'ready'
        return true
    } catch (err) {
        if (mine !== seq || ctl.signal.aborted) return false
        // A quiet read that fails keeps what is shown; the countdown's end retries it, a visit reads again.
        if (quiet && contest.value) return false
        state.value = isAxiosError(err) && err.response?.status === 404 ? 'notFound' : 'error'
        return false
    } finally {
        if (inFlight === ctl) inFlight = null
    }
}

/** A register or withdraw landed: read the contest again (its count, the viewer's flag, the problems it now shows). */
const onChanged = () => void load({ quiet: true })

// A countdown reached its end: read the contest again for its new phase. A read that fails (a network blip), or a
// server that does not say so yet, is asked again after 5, 10, 20, 30, 30 and 30 s; the scoreboard stops polling two
// minutes after the end whatever this learns.
const ELAPSED_RETRY_MS = [5_000, 10_000, 20_000, 30_000, 30_000, 30_000]
let elapsedTimer: ReturnType<typeof setTimeout> | null = null
let elapsedRun = 0
const stopElapsedRetry = () => {
    elapsedRun++
    if (elapsedTimer !== null) clearTimeout(elapsedTimer)
    elapsedTimer = null
}
const onElapsed = () => {
    stopElapsedRetry()
    const run = elapsedRun
    const before = contest.value?.phase
    const attempt = async (i: number) => {
        elapsedTimer = null
        const landed = await load({ quiet: true })
        if (run !== elapsedRun || (landed && contest.value?.phase !== before)) return
        const delay = ELAPSED_RETRY_MS[i]
        if (delay !== undefined) elapsedTimer = setTimeout(() => void attempt(i + 1), delay)
    }
    void attempt(0)
}

watch(
    slug,
    () => {
        stopElapsedRetry()
        tab.value = initialTab()
        contest.value = null
        void load()
    },
    { immediate: true },
)
// A login or logout on the page changes whose progress is shown.
watch(
    () => authStore.user?.id ?? null,
    (id) => {
        if (viewer !== undefined && id !== viewer) void load({ quiet: true })
    },
)
onBeforeUnmount(() => {
    seq++
    inFlight?.abort()
    stopElapsedRetry()
})
</script>
