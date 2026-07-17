<template>
    <div class="flex flex-col gap-[22px]">
        <!-- Page header -->
        <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
                <h1 class="text-[24px] font-semibold leading-tight tracking-tight text-foreground">Judge servers</h1>
                <p class="mt-1 text-sm text-muted-foreground">Registered judge servers and their health.</p>
            </div>
            <Button variant="outline" class="h-[38px]" :disabled="isLoading" @click="load">
                <RefreshCw class="size-4" :class="isLoading && 'animate-spin'" />
                Refresh
            </Button>
        </div>

        <!-- Servers card -->
        <div class="rounded-xl border border-border bg-card">
            <div class="flex items-center justify-between gap-3 border-b border-border p-[18px]">
                <h2 class="text-base font-medium text-foreground">Servers</h2>
                <p v-if="!isLoading && !error && servers.length" class="text-[12px] text-muted-foreground">
                    <span class="font-mono text-foreground">{{ onlineCount }}</span> of
                    <span class="font-mono text-foreground">{{ servers.length }}</span> reporting
                </p>
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="space-y-2.5 p-[18px]">
                <div v-for="n in 5" :key="n" class="h-12 w-full rounded bg-muted animate-ojpulse" />
            </div>

            <!-- Error -->
            <div v-else-if="error" class="p-[18px]">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-err/40 bg-err/5 px-6 py-10 text-center">
                    <TriangleAlert class="size-6 text-err" />
                    <p class="text-sm font-medium text-foreground">Couldn't load judge servers.</p>
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
            <div v-else-if="servers.length === 0" class="p-[18px]">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                    <Server class="size-6 text-muted-foreground" />
                    <p class="text-sm font-medium text-foreground">No judge servers have reported in.</p>
                    <p class="max-w-sm text-xs text-muted-foreground">
                        Check that a judge server is running — they'll appear here once one checks in.
                    </p>
                </div>
            </div>

            <!-- Data -->
            <Table v-else class="min-w-[860px]">
                <TableHeader>
                    <TableRow class="hover:bg-transparent">
                        <TableHead class="px-[18px] py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Host</TableHead>
                        <TableHead class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</TableHead>
                        <TableHead class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">CPU</TableHead>
                        <TableHead class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Memory</TableHead>
                        <TableHead class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tasks</TableHead>
                        <TableHead class="px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Version</TableHead>
                        <TableHead class="px-[18px] py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Last heartbeat</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow
                        v-for="server in servers"
                        :key="`${server.hostname}-${server.ip}`"
                        class="border-b border-border last:border-b-0 hover:bg-muted/40"
                    >
                        <TableCell class="px-[18px] py-3">
                            <div class="flex min-w-0 flex-col">
                                <span class="truncate font-mono text-[13px] text-foreground">{{ server.hostname }}</span>
                                <span class="truncate font-mono text-[11px] text-muted-foreground">{{ server.ip }}</span>
                            </div>
                        </TableCell>
                        <TableCell class="px-3 py-3">
                            <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[12px] text-foreground">
                                <span class="size-1.5 rounded-full" :class="healthDotClass[health(server)]" />
                                {{ healthLabel[health(server)] }}
                            </span>
                        </TableCell>
                        <TableCell class="px-3 py-3 font-mono text-[12px] text-muted-foreground">
                            {{ server.cpuCore }} cores · {{ server.cpuUsage }}%
                        </TableCell>
                        <TableCell class="px-3 py-3 font-mono text-[12px] text-muted-foreground">
                            {{ server.memoryUsage }}%
                        </TableCell>
                        <TableCell class="px-3 py-3 font-mono text-[12px] text-muted-foreground">
                            {{ server.taskNumber }}
                        </TableCell>
                        <TableCell class="px-3 py-3 font-mono text-[12px] text-muted-foreground">
                            {{ server.judgerVersion }}
                        </TableCell>
                        <TableCell class="px-[18px] py-3 font-mono text-[12px] text-muted-foreground">
                            {{ relativeTime(server.lastHeartbeat) }}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Server, RefreshCw, TriangleAlert } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useFetch } from '@/composables/useFetch'
import judgeServerService from '@/services/judgeServerService'
import { relativeTime } from '@/lib/problemDisplay'
import { serverHealth, healthLabel, healthDotClass } from '@/lib/judgeServerDisplay'
import type { JudgeServer } from '@/types/judgeServer'

const { data, isLoading, error, execute } = useFetch(judgeServerService.getJudgeServers, { immediate: false })

const load = () => execute()

const servers = computed<JudgeServer[]>(() => data.value?.data ?? [])
const health = (s: JudgeServer) => serverHealth(s)
const onlineCount = computed(() => servers.value.filter((s) => serverHealth(s) === 'online').length)

onMounted(load)
</script>
