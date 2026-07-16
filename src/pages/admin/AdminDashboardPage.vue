<template>
    <div class="space-y-6">
        <!-- KPI card row -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <!-- Problems (live) -->
            <Card class="gap-0">
                <CardContent class="flex items-start justify-between gap-4">
                    <div class="min-w-0 space-y-2">
                        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Problems</p>
                        <div v-if="isLoading" class="h-9 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                        <p v-else class="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                            {{ totalProblems ?? '—' }}
                        </p>
                        <p class="text-xs text-muted-foreground">Total problems in the catalog.</p>
                    </div>
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileCode2 class="size-5" />
                    </span>
                </CardContent>
            </Card>

            <!-- Users (not wired) -->
            <Card class="gap-0">
                <CardContent class="flex items-start justify-between gap-4">
                    <div class="min-w-0 space-y-2">
                        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Users</p>
                        <p class="font-mono text-3xl font-semibold tabular-nums tracking-tight text-muted-foreground/60">—</p>
                        <p class="text-xs text-muted-foreground">Available soon in the Users section.</p>
                    </div>
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Users class="size-5" />
                    </span>
                </CardContent>
            </Card>

            <!-- Judge servers (not wired) -->
            <Card class="gap-0">
                <CardContent class="flex items-start justify-between gap-4">
                    <div class="min-w-0 space-y-2">
                        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Judge servers</p>
                        <p class="font-mono text-3xl font-semibold tabular-nums tracking-tight text-muted-foreground/60">—</p>
                        <p class="text-xs text-muted-foreground">Available soon in the Judge servers section.</p>
                    </div>
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Server class="size-5" />
                    </span>
                </CardContent>
            </Card>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Recent problems -->
            <Card class="lg:col-span-2">
                <CardHeader class="flex flex-row items-center justify-between gap-3 space-y-0">
                    <div class="space-y-1">
                        <CardTitle class="text-base">Recent problems</CardTitle>
                        <CardDescription>The five most recently listed problems.</CardDescription>
                    </div>
                    <RouterLink
                        :to="ROUTE_PATH.ADMIN_PROBLEMS"
                        class="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        View all
                        <ArrowRight class="size-4" />
                    </RouterLink>
                </CardHeader>
                <CardContent>
                    <!-- Loading -->
                    <div v-if="isLoading" class="space-y-2.5">
                        <div
                            v-for="n in 5"
                            :key="n"
                            class="h-10 w-full animate-pulse rounded bg-muted motion-reduce:animate-none"
                        />
                    </div>

                    <!-- Error -->
                    <div
                        v-else-if="error"
                        class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-6 py-10 text-center"
                    >
                        <TriangleAlert class="size-6 text-destructive" />
                        <p class="text-sm font-medium text-foreground">Couldn't load problems.</p>
                        <p class="max-w-xs text-xs text-muted-foreground">
                            The request failed. Check your connection and try again.
                        </p>
                        <Button variant="outline" size="sm" @click="load">
                            <RefreshCw class="size-4" />
                            Retry
                        </Button>
                    </div>

                    <!-- Empty -->
                    <div
                        v-else-if="problems.length === 0"
                        class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center"
                    >
                        <FileCode2 class="size-6 text-muted-foreground" />
                        <p class="text-sm font-medium text-foreground">No problems yet</p>
                        <p class="max-w-xs text-xs text-muted-foreground">Create your first problem to get started.</p>
                        <RouterLink :to="ROUTE_PATH.ADMIN_PROBLEMS">
                            <Button variant="outline" size="sm">
                                <Plus class="size-4" />
                                Create problem
                            </Button>
                        </RouterLink>
                    </div>

                    <!-- Data -->
                    <Table v-else>
                        <TableHeader>
                            <TableRow>
                                <TableHead class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</TableHead>
                                <TableHead class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slug</TableHead>
                                <TableHead class="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="problem in problems" :key="problem.id">
                                <TableCell class="max-w-[16rem] truncate font-medium text-foreground">{{ problem.title }}</TableCell>
                                <TableCell class="font-mono text-xs text-muted-foreground">{{ problem.problemSlug }}</TableCell>
                                <TableCell class="text-right">
                                    <Badge variant="outline" class="gap-1.5 font-normal">
                                        <span class="size-1.5 rounded-full" :class="statusDot(problem.status)" />
                                        {{ statusLabel(problem.status) }}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <!-- Judge server health placeholder -->
            <Card>
                <CardHeader class="space-y-1">
                    <CardTitle class="text-base">Judge server health</CardTitle>
                    <CardDescription>Live status of connected judge servers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                        <Server class="size-6 text-muted-foreground" />
                        <p class="text-sm font-medium text-foreground">No data yet</p>
                        <p class="max-w-xs text-xs text-muted-foreground">
                            Wired up in the Judge servers section.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { FileCode2, Users, Server, ArrowRight, TriangleAlert, RefreshCw, Plus } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFetch } from '@/composables/useFetch'
import problemService from '@/services/problemService'
import { ROUTE_PATH } from '@/constants/routePath'

const { data, isLoading, error, execute } = useFetch(problemService.getProblems, { immediate: false })

const load = () => execute({ page: 0, size: 5 })

const problems = computed(() => data.value?.data ?? [])
const totalProblems = computed(() => data.value?.pagination?.totalElements ?? null)

const statusLabel = (status: number) => (status === 1 ? 'Active' : 'Inactive')
const statusDot = (status: number) => (status === 1 ? 'bg-emerald-500' : 'bg-muted-foreground')

onMounted(load)
</script>
