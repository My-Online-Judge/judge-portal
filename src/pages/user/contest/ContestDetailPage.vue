<template>
    <div class="animate-enter flex flex-col gap-[18px]">
        <Loading v-if="state === 'loading'" />

        <div v-else-if="state === 'notFound'" class="rounded-xl border bg-card p-10 text-center" role="alert">
            <h1 class="text-lg font-semibold">Contest not found</h1>
            <p class="mt-1 text-sm text-muted-foreground">It may not be published yet, or the link is wrong.</p>
            <RouterLink :to="ROUTE_PATH.CONTESTS" class="mt-3 inline-block text-sm font-medium text-link hover:underline">All contests</RouterLink>
        </div>

        <div v-else-if="state === 'error'" class="rounded-xl border bg-card p-10 text-center" role="alert">
            <h1 class="text-lg font-semibold">Could not load this contest</h1>
            <Button variant="outline" size="sm" class="mt-3" @click="load()">Retry</Button>
        </div>

        <template v-else-if="contest">
            <div class="flex flex-col gap-3">
                <RouterLink :to="ROUTE_PATH.CONTESTS"
                    class="inline-flex items-center gap-1 self-start text-[13px] text-muted-foreground hover:text-foreground">
                    <ChevronLeft class="size-4" aria-hidden="true" /> Contests
                </RouterLink>
                <PageHeader :title="contest.title">
                    <template #actions>
                        <div class="flex min-w-[148px] flex-col items-end gap-0.5 rounded-lg border border-border bg-card px-3.5 py-2">
                            <template v-if="contest.phase !== 'ENDED'">
                                <span class="text-xs text-muted-foreground">{{ contest.phase === 'UPCOMING' ? 'Starts in' : 'Ends in' }}</span>
                                <ContestCountdown :target="contest.phase === 'UPCOMING' ? contest.startsAt : contest.endsAt"
                                    :offset-ms="offsetMs" class="text-[20px] leading-tight font-semibold" @elapsed="onElapsed()" />
                            </template>
                            <span v-else class="text-[15px] leading-[44px] font-semibold text-muted-foreground">Ended</span>
                        </div>
                    </template>
                </PageHeader>
                <div class="flex flex-wrap items-center gap-2.5">
                    <Badge v-if="contest.status === 'DRAFT'" variant="neutral">Draft</Badge>
                    <Badge v-if="contest.phase === 'RUNNING'" variant="success"><Radio aria-hidden="true" />Live</Badge>
                    <span class="meta-strip text-[13px] text-muted-foreground">
                        <span>Starts {{ formatContestDate(contest.startsAt) }}</span>
                        <span>Ends {{ formatContestDate(contest.endsAt) }}</span>
                        <span>{{ formatDuration(Date.parse(contest.endsAt) - Date.parse(contest.startsAt)) }}</span>
                    </span>
                </div>
                <p v-if="contest.description" class="max-w-[72ch] text-[13.5px] whitespace-pre-line text-muted-foreground">{{ contest.description }}</p>
            </div>

            <Tabs v-model="tab" class="gap-0">
                <div class="overflow-hidden rounded-xl border border-border bg-card">
                    <div class="border-b border-border px-3">
                        <TabsList class="h-auto w-full justify-start gap-0.5 rounded-none bg-transparent p-0">
                            <TabsTrigger value="problems"><ListChecks aria-hidden="true" />Problems</TabsTrigger>
                            <TabsTrigger value="scoreboard"><Trophy aria-hidden="true" />Scoreboard</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="problems" class="mt-0">
                        <p v-if="contest.problems.length === 0" class="px-5 py-10 text-center text-sm text-muted-foreground">
                            {{ contest.phase === 'UPCOMING' ? 'Problems appear when the contest starts.' : 'This contest has no problems.' }}
                        </p>
                        <div v-else class="overflow-x-auto">
                            <table class="dt">
                                <thead>
                                    <tr>
                                        <th class="w-20 pl-4">Problem</th>
                                        <th>Title</th>
                                        <th v-if="authStore.user" class="w-32">My status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="p in contest.problems" :key="p.label">
                                        <td class="pl-4 font-mono font-semibold">{{ p.label }}</td>
                                        <td>
                                            <RouterLink v-if="contest.phase !== 'UPCOMING'"
                                                :to="`${ROUTE_PATH.CONTESTS}/${contest.slug}/problems/${p.label}`"
                                                class="font-semibold text-foreground hover:text-link">{{ p.title }}</RouterLink>
                                            <span v-else class="font-semibold">{{ p.title }}</span>
                                        </td>
                                        <td v-if="authStore.user">
                                            <span v-if="contest.myProgress[p.label]?.solved" class="inline-flex items-center text-success">
                                                <Check class="size-4" aria-hidden="true" />
                                                <span class="sr-only">Solved</span>
                                            </span>
                                            <span v-else-if="contest.myProgress[p.label]?.attempts" class="font-mono text-xs text-muted-foreground">
                                                {{ tries(contest.myProgress[p.label]!.attempts) }}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>

                    <TabsContent value="scoreboard" class="mt-0">
                        <!-- Mounted only while shown: it polls every 15 s while the contest runs. -->
                        <ContestScoreboard v-if="tab === 'scoreboard'" :slug="contest.slug" :phase="contest.phase"
                            :ends-at="contest.endsAt" :offset-ms="offsetMs" />
                    </TabsContent>
                </div>
            </Tabs>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import { Check, ChevronLeft, ListChecks, Radio, Trophy } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Loading from '@/components/common/Loading.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ContestCountdown from '@/components/contest/ContestCountdown.vue'
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
