<template>
    <div class="flex flex-col gap-[22px]">
        <!-- Page header -->
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
                <h1 class="text-[24px] font-semibold leading-tight tracking-tight text-foreground">Dashboard</h1>
                <p class="mt-1 text-sm text-muted-foreground">Content, infrastructure and access at a glance.</p>
            </div>
            <RouterLink v-if="hasPermission('problem:create')" :to="ROUTE_PATH.ADMIN_PROBLEMS">
                <Button class="h-[38px]">
                    <Plus class="size-4" />
                    Create problem
                </Button>
            </RouterLink>
        </div>

        <!-- KPI row -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <!-- Problems (live) -->
            <div class="rounded-xl border border-border bg-card p-[18px]">
                <div class="flex items-start justify-between gap-3">
                    <span class="text-[13px] font-medium text-muted-foreground">Problems</span>
                    <ListChecks class="size-[18px] shrink-0 text-muted-foreground" />
                </div>
                <div class="mt-3 flex h-[30px] items-center">
                    <div v-if="isLoading" class="h-5 w-[88px] rounded bg-muted animate-ojpulse" />
                    <p v-else-if="error" class="font-mono text-[30px] font-semibold leading-none text-muted-foreground">—</p>
                    <p v-else class="font-mono text-[30px] font-semibold leading-none tracking-tight text-foreground">
                        {{ totalProblems ?? '—' }}
                    </p>
                </div>
                <p class="mt-2 text-[12px] text-muted-foreground">
                    {{ error ? "Couldn't load" : 'In the catalog' }}
                </p>
            </div>

            <!-- Judge servers (live) -->
            <div class="rounded-xl border border-border bg-card p-[18px]">
                <div class="flex items-start justify-between gap-3">
                    <span class="text-[13px] font-medium text-muted-foreground">Judge servers</span>
                    <Server class="size-[18px] shrink-0 text-muted-foreground" />
                </div>
                <div class="mt-3 flex h-[30px] items-center">
                    <div v-if="canReadJudgeServers && judgeLoading" class="h-5 w-[88px] rounded bg-muted animate-ojpulse" />
                    <p v-else-if="!canReadJudgeServers || judgeError" class="font-mono text-[30px] font-semibold leading-none text-muted-foreground/60">—</p>
                    <p v-else class="font-mono text-[30px] font-semibold leading-none tracking-tight text-foreground">
                        {{ judgeOnline }} / {{ judgeTotal }}
                    </p>
                </div>
                <p class="mt-2 text-[12px] text-muted-foreground">{{ judgeKpiContext }}</p>
            </div>

            <!-- Users (pending — Phase 4) -->
            <div class="rounded-xl border border-border bg-card p-[18px]">
                <div class="flex items-start justify-between gap-3">
                    <span class="text-[13px] font-medium text-muted-foreground">Users</span>
                    <Users class="size-[18px] shrink-0 text-muted-foreground" />
                </div>
                <div class="mt-3 flex h-[30px] items-center">
                    <p class="font-mono text-[30px] font-semibold leading-none text-muted-foreground/60">—</p>
                </div>
                <p class="mt-2 text-[12px] text-muted-foreground">Lands in the Users section.</p>
            </div>
        </div>

        <!-- Two-column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <!-- Judge server health -->
            <div class="rounded-xl border border-border bg-card">
                <div class="flex items-start justify-between gap-3 border-b border-border p-[18px]">
                    <div class="min-w-0">
                        <h2 class="text-base font-medium text-foreground">Judge server health</h2>
                        <p class="mt-0.5 text-[12px] text-muted-foreground">
                            <template v-if="canReadJudgeServers && !judgeError && judgeTotal > 0">
                                <span class="font-mono text-foreground">{{ judgeOnline }}</span> of
                                <span class="font-mono text-foreground">{{ judgeTotal }}</span> reporting
                            </template>
                            <template v-else>Connect in the Judge servers section.</template>
                        </p>
                    </div>
                    <button
                        type="button"
                        class="flex size-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                        aria-label="Refresh judge server health"
                        :disabled="!canReadJudgeServers || judgeLoading"
                        @click="loadJudgeServers"
                    >
                        <RefreshCw class="size-4" :class="canReadJudgeServers && judgeLoading && 'animate-spin'" />
                    </button>
                </div>
                <div class="p-[18px]">
                    <!-- Loading -->
                    <div v-if="canReadJudgeServers && judgeLoading" class="space-y-2.5">
                        <div v-for="n in 4" :key="n" class="h-10 w-full rounded bg-muted animate-ojpulse" />
                    </div>

                    <!-- Error -->
                    <div v-else-if="canReadJudgeServers && judgeError">
                        <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-err/40 bg-err/5 px-6 py-10 text-center">
                            <TriangleAlert class="size-6 text-err" />
                            <p class="text-sm font-medium text-foreground">Couldn't load judge servers.</p>
                            <p class="max-w-[15rem] text-xs text-muted-foreground">
                                The request failed. Check your connection and try again.
                            </p>
                            <Button variant="outline" size="sm" @click="loadJudgeServers">
                                <RefreshCw class="size-4" />
                                Retry
                            </Button>
                        </div>
                    </div>

                    <!-- Empty (no permission or nothing reporting) -->
                    <div v-else-if="judgeTopServers.length === 0">
                        <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                            <Server class="size-6 text-muted-foreground" />
                            <p class="text-sm font-medium text-foreground">No judge servers reporting yet.</p>
                            <p class="max-w-[15rem] text-xs text-muted-foreground">
                                They'll show up here once a judge server checks in.
                            </p>
                        </div>
                    </div>

                    <!-- Data -->
                    <ul v-else class="flex flex-col gap-0.5">
                        <li
                            v-for="server in judgeTopServers"
                            :key="`${server.hostname}-${server.ip}`"
                            class="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
                        >
                            <span class="size-2 shrink-0 rounded-full" :class="healthDotClass[serverHealth(server)]" />
                            <div class="flex min-w-0 flex-col leading-tight">
                                <span class="truncate font-mono text-[13px] text-foreground">{{ server.hostname }}</span>
                                <span class="truncate font-mono text-[11px] text-muted-foreground">{{ server.ip }}</span>
                            </div>
                            <span class="ml-auto shrink-0 font-mono text-[12px] text-muted-foreground">
                                {{ relativeTime(server.lastHeartbeat) }}
                            </span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Recent problems -->
            <div class="min-w-0 rounded-xl border border-border bg-card">
                <div class="flex items-center justify-between gap-3 border-b border-border p-[18px]">
                    <h2 class="text-base font-medium text-foreground">Recent problems</h2>
                    <RouterLink
                        :to="ROUTE_PATH.ADMIN_PROBLEMS"
                        class="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        View all
                        <ArrowRight class="size-4" />
                    </RouterLink>
                </div>

                <!-- Loading -->
                <div v-if="isLoading" class="space-y-2.5 p-[18px]">
                    <div v-for="n in 5" :key="n" class="h-10 w-full rounded bg-muted animate-ojpulse" />
                </div>

                <!-- Error -->
                <div v-else-if="error" class="p-[18px]">
                    <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-err/40 bg-err/5 px-6 py-10 text-center">
                        <TriangleAlert class="size-6 text-err" />
                        <p class="text-sm font-medium text-foreground">Couldn't load problems.</p>
                        <p class="max-w-xs text-xs text-muted-foreground">
                            The request failed. Check your connection and try again.
                        </p>
                        <Button variant="outline" size="sm" @click="load">
                            <RefreshCw class="size-4" />
                            Retry
                        </Button>
                    </div>
                </div>

                <!-- Empty -->
                <div v-else-if="problems.length === 0" class="p-[18px]">
                    <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                        <ListChecks class="size-6 text-muted-foreground" />
                        <p class="text-sm font-medium text-foreground">No problems yet — create one.</p>
                        <RouterLink :to="ROUTE_PATH.ADMIN_PROBLEMS">
                            <Button variant="outline" size="sm">
                                <Plus class="size-4" />
                                Create problem
                            </Button>
                        </RouterLink>
                    </div>
                </div>

                <!-- Data -->
                <template v-else>
                    <div class="overflow-x-auto">
                        <table class="w-full min-w-[640px] border-collapse text-sm">
                            <thead>
                                <tr class="border-b border-border text-left">
                                    <th class="px-[18px] py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">ID</th>
                                    <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Title</th>
                                    <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Difficulty</th>
                                    <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                                    <th class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Updated</th>
                                    <th class="px-[18px] py-2.5"><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="problem in problems"
                                    :key="problem.id"
                                    class="border-b border-border last:border-b-0 transition-colors hover:bg-muted/40"
                                >
                                    <td class="whitespace-nowrap px-[18px] py-3 font-mono text-[12px] text-muted-foreground">
                                        {{ shortId(problem.id) }}
                                    </td>
                                    <td class="px-3 py-3">
                                        <div class="flex min-w-0 flex-col">
                                            <span class="truncate font-medium text-foreground">{{ problem.title }}</span>
                                            <span class="truncate font-mono text-[11px] text-muted-foreground">{{ problem.problemSlug }}</span>
                                        </div>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-muted-foreground">
                                        {{ difficultyLabel(problem.hardnessLevel) }}
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-3">
                                        <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[12px] text-foreground">
                                            <span class="size-1.5 rounded-full" :class="statusDotClass(problem.status)" />
                                            {{ statusLabel(problem.status) }}
                                        </span>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-3 font-mono text-[12px] text-muted-foreground">
                                        {{ relativeTime(problem.updatedAt) }}
                                    </td>
                                    <td class="whitespace-nowrap px-[18px] py-3 text-right">
                                        <button
                                            type="button"
                                            class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="Problem actions"
                                        >
                                            <MoreHorizontal class="size-4" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Footer -->
                    <div class="flex items-center justify-between gap-3 border-t border-border p-[18px]">
                        <p class="text-[12px] text-muted-foreground">
                            Showing <span class="font-mono text-foreground">{{ shownCount }}</span> of
                            <span class="font-mono text-foreground">{{ totalProblems ?? shownCount }}</span>
                        </p>
                        <div class="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>Previous</Button>
                            <RouterLink :to="ROUTE_PATH.ADMIN_PROBLEMS">
                                <Button variant="outline" size="sm">Next</Button>
                            </RouterLink>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
    ListChecks,
    Users,
    Server,
    ArrowRight,
    TriangleAlert,
    RefreshCw,
    Plus,
    MoreHorizontal,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'
import judgeServerService from '@/services/judgeServerService'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from '@/constants/routePath'
import { shortId, difficultyLabel, statusLabel, statusDotClass, relativeTime } from '@/lib/problemDisplay'
import { serverHealth, healthDotClass } from '@/lib/judgeServerDisplay'
import type { JudgeServer } from '@/types/judgeServer'

const authStore = useAuthStore()
const hasPermission = (permission: string) => authStore.hasPermission(permission)

// --- Problems (Recent problems card + Problems KPI) ---
const { data, isLoading, error, execute } = useFetch(problemService.getProblems, { immediate: false })

const load = () => execute({ page: 0, size: 5 })

const problems = computed(() => data.value?.data ?? [])
const totalProblems = computed(() => data.value?.pagination?.totalElements ?? null)
const shownCount = computed(() => problems.value.length)

// --- Judge servers (health card + Judge servers KPI) ---
// Independent fetch, gated on the read permission so a user without it
// gets the graceful pending/empty treatment rather than an error.
const canReadJudgeServers = computed(() => hasPermission('judgeserver:read'))

const {
    data: judgeData,
    isLoading: judgeLoading,
    error: judgeError,
    execute: judgeExecute,
} = useFetch(judgeServerService.getJudgeServers, { immediate: false })

const loadJudgeServers = () => judgeExecute()

const judgeServers = computed<JudgeServer[]>(() => judgeData.value?.data ?? [])
const judgeTotal = computed(() => judgeServers.value.length)
const judgeOnline = computed(() => judgeServers.value.filter((s) => serverHealth(s) === 'online').length)
const judgeStale = computed(() => judgeTotal.value - judgeOnline.value)
const judgeTopServers = computed(() => judgeServers.value.slice(0, 5))

const judgeKpiContext = computed(() => {
    if (!canReadJudgeServers.value) return 'Wired up in the Judge servers section.'
    if (judgeError.value) return "Couldn't load"
    if (judgeLoading.value) return 'Checking in…'
    if (judgeTotal.value === 0) return 'None reporting'
    return judgeStale.value > 0 ? `${judgeStale.value} stale/offline` : 'All reporting'
})

onMounted(() => {
    load()
    if (canReadJudgeServers.value) loadJudgeServers()
})
</script>
