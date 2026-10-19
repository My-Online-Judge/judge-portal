<template>
    <div class="flex flex-col gap-[18px]">
        <PageHeader
            title="Judge servers"
            description="Servers report a heartbeat every few seconds. A server is offline when its last heartbeat is too old."
        >
            <template #actions>
                <span v-if="servers.length" class="text-xs text-muted-foreground tabular-nums">
                    {{ onlineCount }} of {{ servers.length }} online
                </span>
                <Button variant="secondary" :disabled="isLoading" @click="load">
                    <RefreshCw :class="isLoading && 'animate-spin motion-reduce:animate-none'" />
                    Refresh
                </Button>
            </template>
        </PageHeader>

        <div :class="framed && 'overflow-hidden rounded-xl border border-border bg-card'">
            <ListStateShell
                :loading="isLoading"
                :error="error ? 'The request failed. Check your connection and try again.' : null"
                :has-data="data !== null"
                :empty="servers.length === 0"
                empty-title="No judge servers have reported in"
                empty-hint="Start a judge server. It appears here after its first heartbeat."
                @retry="load"
            >
                <template #skeleton>
                    <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                        <div v-for="n in 3" :key="n" class="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-4">
                            <span class="sk h-4 w-28" />
                            <span class="sk w-full" />
                            <span class="sk w-2/3" />
                        </div>
                    </div>
                </template>

                <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                    <article
                        v-for="server in sortedServers"
                        :key="`${server.hostname}-${server.ip}`"
                        class="flex min-w-0 flex-col gap-3.5 rounded-xl border p-4"
                        :class="cardClass(server)"
                        :aria-label="`${server.hostname}, ${serverStatus(server).label}`"
                    >
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <b class="block truncate font-mono text-[13px] font-semibold">{{ server.hostname }}</b>
                                <div class="meta-strip font-mono text-[11.5px] text-muted-foreground">
                                    <span>{{ server.ip }}</span>
                                    <span>judger v{{ server.judgerVersion }}</span>
                                    <span>{{ server.cpuCore }} cores</span>
                                </div>
                            </div>
                            <Badge :variant="serverStatus(server).variant">
                                <span v-if="serverStatus(server).dot" class="size-[7px] shrink-0 rounded-full bg-current" aria-hidden="true" />
                                <component :is="serverStatus(server).icon" v-else-if="serverStatus(server).icon" aria-hidden="true" />
                                {{ serverStatus(server).label }}
                            </Badge>
                        </div>

                        <!-- Offline: what it means, and where it was last seen -->
                        <template v-if="serverStatus(server).health === 'offline'">
                            <div
                                role="status"
                                class="flex items-start gap-2.5 rounded-lg border border-[color-mix(in_oklch,var(--destructive)_25%,transparent)] bg-destructive-soft px-3 py-2.5 text-[12.5px] leading-normal text-destructive-ink"
                            >
                                <Activity class="mt-px size-4 shrink-0" aria-hidden="true" />
                                <span>No heartbeat for <b class="font-semibold">{{ relativeTime(server.lastHeartbeat) }}</b>. New submissions go to the servers that are online.</span>
                            </div>
                            <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>Last seen {{ fmtDate(server.lastHeartbeat) }}</span>
                                <span class="truncate font-mono">{{ server.serviceUrl }}</span>
                            </div>
                        </template>

                        <!-- Disabled: still reporting, gets no work -->
                        <template v-else-if="serverStatus(server).health === 'disabled'">
                            <p class="text-xs text-muted-foreground">Disabled by an admin. It reports a heartbeat but gets no submissions.</p>
                            <div class="text-xs text-muted-foreground">
                                Heartbeat <span class="font-mono text-foreground">{{ relativeTime(server.lastHeartbeat) }}</span> ago
                            </div>
                        </template>

                        <!-- Online: load, without a track behind the bars -->
                        <template v-else>
                            <div class="flex flex-col gap-2">
                                <div v-for="m in meters(server)" :key="m.label" class="grid grid-cols-[56px_minmax(0,1fr)_38px] items-center gap-2.5">
                                    <span class="text-xs text-muted-foreground">{{ m.label }}</span>
                                    <span class="block h-1.5" aria-hidden="true">
                                        <i class="block h-full rounded-[3px] bg-primary" :style="{ width: `${m.value}%` }" />
                                    </span>
                                    <span class="text-right font-mono text-xs tabular-nums">{{ m.value }}%</span>
                                </div>
                            </div>
                            <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                                <span><span class="text-muted-foreground">Running tasks</span> <b class="font-mono font-semibold">{{ server.taskNumber }}</b></span>
                                <span class="text-muted-foreground">Heartbeat <span class="font-mono text-foreground">{{ relativeTime(server.lastHeartbeat) }}</span> ago</span>
                            </div>
                        </template>
                    </article>
                </div>
            </ListStateShell>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Activity, RefreshCw } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import { useFetch } from '@/composables/useFetch'
import judgeServerService from '@/services/judgeServerService'
import { relativeTime } from '@/lib/problemDisplay'
import { serverHealth, serverStatus } from '@/lib/judgeServerDisplay'
import type { JudgeServer } from '@/types/judgeServer'

const { data, isLoading, error, execute } = useFetch(judgeServerService.getJudgeServers, { immediate: false })

const load = () => execute()

const servers = computed<JudgeServer[]>(() => data.value?.data ?? [])
const onlineCount = computed(() => servers.value.filter((s) => serverHealth(s) === 'online').length)

// Offline servers sort first; the rest keep the order the API sent.
const sortedServers = computed(() =>
    [...servers.value].sort((a, b) => Number(serverHealth(b) === 'offline') - Number(serverHealth(a) === 'offline')),
)

// Error and empty states sit in a card; loaded servers are their own cards.
const framed = computed(() => !isLoading.value && servers.value.length === 0)

const cardClass = (s: JudgeServer) => {
    switch (serverHealth(s)) {
        case 'offline':
            return 'border-[color-mix(in_oklch,var(--destructive)_45%,var(--border))] bg-card shadow-[inset_3px_0_0_var(--destructive)]'
        case 'disabled':
            return 'border-border bg-[color-mix(in_oklch,var(--muted)_50%,var(--card))]'
        default:
            return 'border-border bg-card'
    }
}

const clampPct = (n: number) => Math.min(Math.max(Math.round(Number(n) || 0), 0), 100)
const meters = (s: JudgeServer) => [
    { label: 'CPU', value: clampPct(s.cpuUsage) },
    { label: 'Memory', value: clampPct(s.memoryUsage) },
]

const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
        ? '-'
        : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

onMounted(load)
</script>
