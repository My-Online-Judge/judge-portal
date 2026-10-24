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
            <!-- Page head: back link, title, then the contest's facts as an inline list (as on the solve screen) -->
            <div class="flex flex-col gap-3">
                <RouterLink :to="ROUTE_PATH.CONTESTS"
                    class="relative inline-flex items-center gap-1 self-start rounded-sm text-sm text-ink-2 transition-colors motion-reduce:transition-none after:absolute after:inset-x-0 after:-inset-y-3 hover:text-primary">
                    <ChevronLeft class="size-4" aria-hidden="true" /> Contests
                </RouterLink>
                <h1 class="font-display text-2xl break-words text-foreground">{{ contest.title }}</h1>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                            <dt>Status</dt>
                            <dd><ContestStatus :phase="contest.phase" /></dd>
                        </div>
                        <!-- 16 px against the 14 px of its neighbours: keep the label on the same baseline. -->
                        <div v-if="contest.phase !== 'ENDED'" class="items-baseline">
                            <dt>{{ contest.phase === 'UPCOMING' ? 'Starts in' : 'Ends in' }}</dt>
                            <dd>
                                <ContestCountdown :target="contest.phase === 'UPCOMING' ? contest.startsAt : contest.endsAt"
                                    :offset-ms="offsetMs" @elapsed="onElapsed()" />
                            </dd>
                        </div>
                    </dl>
                    <Badge v-if="contest.status === 'DRAFT'" variant="neutral">Draft</Badge>
                </div>
                <p v-if="contest.description" class="max-w-[64ch] text-base whitespace-pre-line text-ink-2">{{ contest.description }}</p>
            </div>

            <Tabs v-model="tab">
                <!-- The tab row reaches 12 px into the gutter, as the tables do, so the first label lines up with the head. -->
                <div class="-mx-3">
                    <TabsList class="w-full">
                        <TabsTrigger value="problems"><ListChecks aria-hidden="true" />Problems</TabsTrigger>
                        <TabsTrigger value="scoreboard"><Trophy aria-hidden="true" />Scoreboard</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="problems" class="mt-4">
                    <p v-if="contest.problems.length === 0" class="py-10 text-center text-base text-ink-2">
                        {{ contest.phase === 'UPCOMING' ? 'Problems appear when the contest starts.' : 'This contest has no problems.' }}
                    </p>
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

                <TabsContent value="scoreboard" class="mt-4">
                    <!-- Mounted only while shown: it polls every 15 s while the contest runs. -->
                    <ContestScoreboard v-if="tab === 'scoreboard'" :slug="contest.slug" :phase="contest.phase"
                        :ends-at="contest.endsAt" :offset-ms="offsetMs" />
                </TabsContent>
            </Tabs>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import { Check, ChevronLeft, ListChecks, Trophy } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Loading from '@/components/common/Loading.vue'
import ContestCountdown from '@/components/contest/ContestCountdown.vue'
import ContestStatus from '@/components/contest/ContestStatus.vue'
import ContestScoreboard from '@/components/contest/ContestScoreboard.vue'
import contestService from '@/services/contestService'
import { ensureFreshSession } from '@/api/refreshSession'
import { useAuthStore } from '@/stores/auth'
import { formatContestDate, formatDuration, serverOffsetMs } from '@/lib/contestTime'
import { ROUTE_PATH } from '@/constants/routePath'
import type { ContestDetail } from '@/types/contest'

// problem-service refuses this slug for a contest; the path /contests/all is the managers' list.
const RESERVED_SLUG = 'all'

const route = useRoute()
const authStore = useAuthStore()

const slug = computed(() => String(route.params.slug ?? ''))
const state = ref<'loading' | 'ready' | 'notFound' | 'error'>('loading')
const contest = shallowRef<ContestDetail | null>(null)
const offsetMs = ref(0)
const tab = ref('problems')

const tries = (n: number) => (n === 1 ? '1 try' : `${n} tries`)

let seq = 0
let inFlight: AbortController | null = null
// The signed-in user myProgress was read for; undefined until a load has asked.
let viewer: string | null | undefined

/** `quiet` keeps the page as it is while reading (a countdown ended, or the user changed). True when the read landed. */
const load = async ({ quiet = false } = {}): Promise<boolean> => {
    const mine = ++seq
    inFlight?.abort()
    // The slug "all" is reserved: GET /contests/all is the managers' paged list, never a contest, so do not read it.
    if (slug.value === RESERVED_SLUG) {
        inFlight = null
        state.value = 'notFound'
        return false
    }
    const ctl = new AbortController()
    inFlight = ctl
    if (!quiet || !contest.value) state.value = 'loading'
    try {
        // Right after a reload the header's /auth/me may still be on its way: wait for it. myProgress rides on the
        // access cookie, which a public read does not refresh by itself.
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
        tab.value = 'problems'
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
