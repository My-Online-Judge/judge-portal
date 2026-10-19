<template>
    <div class="flex flex-col gap-[18px]">
        <PageHeader title="Dashboard" description="Content, infrastructure and access at a glance.">
            <template v-if="hasPermission('problem:create')" #actions>
                <Button as-child>
                    <RouterLink :to="CREATE_PROBLEM_PATH">
                        <Plus class="size-4" />
                        New problem
                    </RouterLink>
                </Button>
            </template>
        </PageHeader>

        <!-- Each cell loads and fails on its own -->
        <StatStrip>
            <StatCell
                label="Problems"
                :icon="ListChecks"
                :loading="isLoading && data === null"
                :error="!!error && data === null"
                :value="totalProblems === null ? '-' : fmtCount(totalProblems)"
                :context="problemsContext"
                @retry="loadProblemsCell"
            />
            <StatCell
                label="Judge servers"
                :icon="Server"
                :loading="canReadJudgeServers && judgeLoading && judgeData === null"
                :error="canReadJudgeServers && !!judgeError && judgeData === null"
                :value="canReadJudgeServers ? judgeOnline : '-'"
                :suffix="canReadJudgeServers ? `/ ${judgeTotal} online` : undefined"
                :context="judgeContext"
                @retry="loadJudgeServers"
            />
            <StatCell
                label="Users"
                :icon="Users"
                :loading="canReadUsers && usersLoading && usersData === null"
                :error="canReadUsers && !!usersError && usersData === null"
                :value="canReadUsers && totalUsers !== null ? fmtCount(totalUsers) : '-'"
                :context="canReadUsers ? undefined : 'Needs the user:read permission'"
                @retry="loadUsers"
            />
            <StatCell
                label="Active bans"
                :icon="ShieldAlert"
                :loading="canReadBans && bansLoading && bansData === null"
                :error="canReadBans && !!bansError && bansData === null"
                :value="canReadBans && totalBans !== null ? fmtCount(totalBans) : '-'"
                :context="canReadBans ? undefined : 'Needs the ban:read permission'"
                @retry="loadBans"
            />
        </StatStrip>

        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <!-- Judge server health: numbers only -->
            <section class="min-w-0 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="dash-judges">
                <div class="flex flex-wrap items-center gap-2.5 border-b border-border px-3.5 py-3">
                    <h2 id="dash-judges" class="text-sm font-semibold">Judge server health</h2>
                    <span v-if="canReadJudgeServers && judgeTotal > 0" class="text-xs text-muted-foreground tabular-nums">
                        {{ judgeOnline }} of {{ judgeTotal }} online
                    </span>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        class="ml-auto"
                        aria-label="Refresh judge server health"
                        :disabled="!canReadJudgeServers || judgeLoading"
                        @click="loadJudgeServers"
                    >
                        <RefreshCw :class="canReadJudgeServers && judgeLoading && 'animate-spin motion-reduce:animate-none'" />
                    </Button>
                </div>

                <p v-if="!canReadJudgeServers" class="px-3.5 py-8 text-center text-[13px] text-muted-foreground">
                    Server health needs the <span class="font-mono">judgeserver:read</span> permission.
                </p>
                <ListStateShell
                    v-else
                    :loading="judgeLoading"
                    :error="judgeError ? 'The request failed. Check your connection and try again.' : null"
                    :has-data="judgeData !== null"
                    :empty="judgeServers.length === 0"
                    :rows="3"
                    empty-title="No judge servers reporting yet"
                    empty-hint="They appear here once a judge server checks in."
                    @retry="loadJudgeServers"
                >
                    <div class="overflow-x-auto">
                        <table class="dt min-w-[560px]">
                            <thead>
                                <tr>
                                    <th>Server</th>
                                    <th>Status</th>
                                    <th class="num">CPU</th>
                                    <th class="num">Memory</th>
                                    <th class="num">Tasks</th>
                                    <th class="num">Heartbeat</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="server in judgeTopServers"
                                    :key="`${server.hostname}-${server.ip}`"
                                    :class="{ 'row-warn': serverStatus(server).health === 'offline' }"
                                >
                                    <td>
                                        <b class="font-mono text-[12.5px] font-semibold">{{ server.hostname }}</b>
                                        <div class="slug meta-strip">
                                            <span>{{ server.ip }}</span>
                                            <span>v{{ server.judgerVersion }}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <Badge :variant="serverStatus(server).variant">
                                            <span v-if="serverStatus(server).dot" class="size-[7px] shrink-0 rounded-full bg-current" aria-hidden="true" />
                                            <component :is="serverStatus(server).icon" v-else-if="serverStatus(server).icon" aria-hidden="true" />
                                            {{ serverStatus(server).label }}
                                        </Badge>
                                    </td>
                                    <template v-if="serverStatus(server).health === 'offline'">
                                        <td class="num text-muted-foreground">-</td>
                                        <td class="num text-muted-foreground">-</td>
                                        <td class="num text-muted-foreground">-</td>
                                        <td class="num text-destructive-ink">{{ relativeTime(server.lastHeartbeat) }}</td>
                                    </template>
                                    <template v-else>
                                        <td class="num">{{ server.cpuUsage }}%</td>
                                        <td class="num">{{ server.memoryUsage }}%</td>
                                        <td class="num">{{ server.taskNumber }}</td>
                                        <td class="num text-muted-foreground">{{ relativeTime(server.lastHeartbeat) }}</td>
                                    </template>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </ListStateShell>
            </section>

            <!-- Recent activity: the latest problems -->
            <section class="min-w-0 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="dash-activity">
                <div class="flex flex-wrap items-center gap-2.5 border-b border-border px-3.5 py-3">
                    <h2 id="dash-activity" class="text-sm font-semibold">Recent activity</h2>
                    <span class="text-xs text-muted-foreground">Problems</span>
                </div>
                <ListStateShell
                    :loading="isLoading"
                    :error="error ? 'The request failed. Check your connection and try again.' : null"
                    :has-data="data !== null"
                    :empty="problems.length === 0"
                    :rows="5"
                    empty-title="No problems yet"
                    empty-hint="Create one to start the catalog."
                    @retry="loadProblemsCell"
                >
                    <template #empty-action>
                        <Button v-if="hasPermission('problem:create')" variant="secondary" size="sm" as-child>
                            <RouterLink :to="CREATE_PROBLEM_PATH">
                                <Plus class="size-4" />
                                New problem
                            </RouterLink>
                        </Button>
                    </template>
                    <ul class="m-0 list-none py-1">
                        <li v-for="problem in problems" :key="problem.id" class="flex items-center gap-2.5 px-3.5 py-[9px] text-[13px]">
                            <span class="grid size-[26px] shrink-0 place-items-center rounded-[7px] bg-muted text-muted-foreground" aria-hidden="true">
                                <component :is="activityIcon(problem)" class="size-3.5" />
                            </span>
                            <span class="min-w-0 flex-1 truncate">
                                <RouterLink
                                    :to="{ name: 'AdminProblemDetail', params: { slug: problem.problemSlug } }"
                                    class="font-semibold text-foreground hover:text-link hover:underline"
                                >{{ problem.title }}</RouterLink>
                                <span class="text-xs text-muted-foreground"> {{ activityVerb(problem) }}</span>
                            </span>
                            <span class="shrink-0 text-xs text-muted-foreground tabular-nums">{{ relativeTime(problem.updatedAt) }}</span>
                        </li>
                    </ul>
                </ListStateShell>
                <div class="border-t border-border px-3.5 py-2.5">
                    <RouterLink
                        :to="ROUTE_PATH.ADMIN_PROBLEMS"
                        class="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        All problems
                        <ArrowRight class="size-3" aria-hidden="true" />
                    </RouterLink>
                </div>
            </section>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
    ArrowRight,
    EyeOff,
    ListChecks,
    Pencil,
    Plus,
    RefreshCw,
    Server,
    ShieldAlert,
    Users,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'
import StatStrip from '@/components/common/StatStrip.vue'
import StatCell from '@/components/common/StatCell.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'
import userService from '@/services/userService'
import judgeServerService from '@/services/judgeServerService'
import securityService from '@/services/securityService'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from '@/constants/routePath'
import { relativeTime } from '@/lib/problemDisplay'
import { serverHealth, serverStatus } from '@/lib/judgeServerDisplay'
import type { JudgeServer } from '@/types/judgeServer'
import type { Problem } from '@/types/problem'

const CREATE_PROBLEM_PATH = `${ROUTE_PATH.ADMIN_PROBLEMS}/new`

const authStore = useAuthStore()
const hasPermission = (permission: string) => authStore.hasPermission(permission)

const fmtCount = (n: number) => n.toLocaleString('en-US')

// --- Problems (stat cell + recent activity) ---
const { data, isLoading, error, execute } = useFetch(problemService.getProblems, { immediate: false })
// A one-row page filtered to inactive gives the inactive count; active is the rest.
const { data: inactiveData, execute: inactiveExecute } = useFetch(problemService.getProblems, { immediate: false })

const load = () => execute({ page: 0, size: 5 })
const loadInactive = () => inactiveExecute({ page: 0, size: 1, status: 'INACTIVE' })
const loadProblemsCell = () => {
    load()
    loadInactive()
}

const problems = computed(() => data.value?.data ?? [])
const totalProblems = computed(() => data.value?.pagination?.totalElements ?? null)
const inactiveProblems = computed(() => inactiveData.value?.pagination?.totalElements ?? null)
const problemsContext = computed(() => {
    if (totalProblems.value === null || inactiveProblems.value === null) return undefined
    const inactive = inactiveProblems.value
    const active = Math.max(totalProblems.value - inactive, 0)
    return `${fmtCount(active)} active, ${fmtCount(inactive)} inactive`
})

// A problem whose last update is its creation reads as "created".
const isFresh = (p: Problem) => {
    const created = new Date(p.createdAt).getTime()
    const updated = new Date(p.updatedAt).getTime()
    return Number.isNaN(created) || Number.isNaN(updated) || Math.abs(updated - created) < 5000
}
const activityIcon = (p: Problem) => (p.status !== 1 ? EyeOff : isFresh(p) ? Plus : Pencil)
const activityVerb = (p: Problem) => `${isFresh(p) ? 'created' : 'updated'}${p.status !== 1 ? ', inactive' : ''}`

// --- Judge servers (stat cell + health table), gated on the read permission ---
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
// Offline servers first, so a problem is never below the fold of the card.
const judgeTopServers = computed(() =>
    [...judgeServers.value]
        .sort((a, b) => Number(serverHealth(b) === 'offline') - Number(serverHealth(a) === 'offline'))
        .slice(0, 5),
)

const judgeContext = computed(() => {
    if (!canReadJudgeServers.value) return 'Needs the judgeserver:read permission'
    if (judgeTotal.value === 0) return 'None reporting'
    const offline = judgeServers.value.filter((s) => serverHealth(s) === 'offline')
    const disabled = judgeServers.value.filter((s) => serverHealth(s) === 'disabled').length
    const parts: string[] = []
    if (offline.length === 1) parts.push(`${offline[0]!.hostname} offline`)
    else if (offline.length > 1) parts.push(`${offline.length} offline`)
    if (disabled > 0) parts.push(`${disabled} disabled`)
    return parts.length ? parts.join(', ') : 'All online'
})

// --- Users: only the total is needed, so ask for a single row ---
const canReadUsers = computed(() => hasPermission('user:read'))
const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
    execute: usersExecute,
} = useFetch(userService.list, { immediate: false })

const loadUsers = () => usersExecute({ size: 1 })
const totalUsers = computed(() => usersData.value?.pagination?.totalElements ?? null)

// --- Active bans: the total of the bans list ---
const canReadBans = computed(() => hasPermission('ban:read'))
const {
    data: bansData,
    isLoading: bansLoading,
    error: bansError,
    execute: bansExecute,
} = useFetch(securityService.listBans, { immediate: false })

const loadBans = () => bansExecute({ page: 0, size: 1 })
const totalBans = computed(() => bansData.value?.pagination?.totalElements ?? null)

onMounted(() => {
    loadProblemsCell()
    if (canReadUsers.value) loadUsers()
    if (canReadJudgeServers.value) loadJudgeServers()
    if (canReadBans.value) loadBans()
})
</script>
