<template>
    <Card>
        <CardHeader class="space-y-1">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0">
                    <CardTitle class="text-base">Permissions</CardTitle>
                    <CardDescription>The full permission catalog, grouped by resource. Read-only.</CardDescription>
                </div>
                <Button variant="outline" size="sm" class="h-[34px]" :disabled="isLoading" @click="load">
                    <RefreshCw class="size-4" :class="isLoading && 'animate-spin'" />
                    Refresh
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <!-- Loading -->
            <div v-if="isLoading" class="space-y-2.5">
                <div v-for="n in 5" :key="n" class="h-12 w-full rounded bg-muted animate-ojpulse" />
            </div>

            <!-- Error -->
            <div v-else-if="error">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-err/40 bg-err/5 px-6 py-10 text-center">
                    <TriangleAlert class="size-6 text-err" />
                    <p class="text-sm font-medium text-foreground">Couldn't load permissions.</p>
                    <p class="max-w-xs text-xs text-muted-foreground">The request failed. Check your connection and try again.</p>
                    <Button variant="outline" size="sm" @click="load">
                        <RefreshCw class="size-4" />
                        Retry
                    </Button>
                </div>
            </div>

            <!-- Empty -->
            <div v-else-if="permissions.length === 0">
                <div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                    <KeyRound class="size-6 text-muted-foreground" />
                    <p class="text-sm font-medium text-foreground">No permissions in the catalog.</p>
                    <p class="max-w-sm text-xs text-muted-foreground">The permission catalog is seeded by the server — it will appear here once available.</p>
                </div>
            </div>

            <!-- Data -->
            <div v-else class="space-y-6">
                <section v-for="group in groups" :key="group.resource" class="overflow-hidden rounded-lg border border-border">
                    <div class="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
                        <h3 class="text-sm font-medium text-foreground">{{ group.label }}</h3>
                        <span class="font-mono text-[11px] text-muted-foreground">{{ group.names.length }}</span>
                    </div>
                    <Table>
                        <TableBody>
                            <TableRow
                                v-for="name in group.names"
                                :key="name"
                                class="border-b border-border last:border-b-0 hover:bg-muted/40"
                            >
                                <TableCell class="w-[280px] px-4 py-2.5 align-top">
                                    <code class="font-mono text-[12px] text-foreground">{{ name }}</code>
                                </TableCell>
                                <TableCell class="px-4 py-2.5 text-[13px] text-muted-foreground">
                                    {{ descOf(name) || '—' }}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </section>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw, TriangleAlert, KeyRound } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { useFetch } from '@/composables/useFetch'
import permissionService from '@/services/permissionService'
import { groupByResource } from '@/lib/permissionDisplay'
import type { Permission } from '@/types/permission'

const { data, isLoading, error, execute } = useFetch(permissionService.getPermissions)

const load = () => execute()

const permissions = computed<Permission[]>(() => data.value?.data ?? [])
const groups = computed(() => groupByResource(permissions.value.map((p) => p.name)))

const permByName = computed(() => new Map(permissions.value.map((p) => [p.name, p])))
const descOf = (name: string) => permByName.value.get(name)?.description
</script>
