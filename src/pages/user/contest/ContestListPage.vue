<template>
    <div class="flex flex-col gap-6">
        <PageHeader title="Contests"
            description="Timed problem sets, ranked live by problems solved and then by penalty time. Anyone signed in can take part." />

        <ListStateShell :loading="isLoading" :error="error ? 'Check your connection and try again.' : null"
            :has-data="!!list" :empty="total === 0" :rows="4" empty-title="No contests yet"
            empty-hint="Contests appear here once an admin publishes them." @retry="load">
            <template #skeleton>
                <div class="flex flex-col border-t border-rule-2" aria-busy="true">
                    <div v-for="n in 4" :key="n" class="flex h-13 items-center gap-4 border-b border-border">
                        <span class="sk w-full max-w-65" />
                        <span class="sk ml-auto w-24 shrink-0" />
                    </div>
                </div>
            </template>
            <div class="flex flex-col gap-8">
                <section v-for="sec in sections" :key="sec.key" :aria-labelledby="`contests-${sec.key}`"
                    class="flex flex-col gap-2">
                    <h2 :id="`contests-${sec.key}`" class="flex items-baseline gap-2 text-base font-semibold text-foreground">
                        {{ sec.title }}
                        <span class="text-sm font-normal tabular-nums text-muted-foreground">{{ sec.items.length }}</span>
                    </h2>
                    <!-- The rows sit 12 px outside the column so their text lines up with the page head. Start, length
                         and problem count are columns from lg; under it they sit under the title. -->
                    <div class="-mx-3">
                        <Table>
                            <TableHeader>
                                <TableRow class="hover:bg-transparent">
                                    <TableHead scope="col">Title</TableHead>
                                    <TableHead scope="col" class="w-44 lg:w-48">Status</TableHead>
                                    <TableHead scope="col" class="hidden w-44 lg:table-cell">Start</TableHead>
                                    <TableHead scope="col" class="hidden w-28 lg:table-cell">Duration</TableHead>
                                    <TableHead scope="col" class="hidden w-24 text-right lg:table-cell">Problems</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <!-- The title link covers the row through its ::after, so the whole row opens the contest and the row keeps one link. -->
                                <TableRow v-for="c in sec.items" :key="c.slug" class="relative">
                                    <TableCell class="whitespace-normal break-words">
                                        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <RouterLink :to="`${ROUTE_PATH.CONTESTS}/${c.slug}`"
                                                class="min-w-0 text-base font-medium text-foreground after:absolute after:inset-0 hover:text-primary hover:underline">{{ c.title }}</RouterLink>
                                            <Badge v-if="c.status === 'DRAFT'" variant="neutral">Draft</Badge>
                                        </div>
                                        <!-- Under lg: the start, then the length and size. -->
                                        <div class="mt-1 flex flex-col gap-0.5 text-sm tabular-nums text-ink-2 lg:hidden">
                                            <span>{{ formatContestDate(c.startsAt) }}</span>
                                            <span>{{ lengthOf(c) }}, {{ c.problemCount === 1 ? '1 problem' : `${c.problemCount} problems` }}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell class="py-2">
                                        <ContestStatus :phase="sec.phase" />
                                        <!-- A span, not a p: the base p rule sets text-wrap, which would let the cell wrap. -->
                                        <span v-if="sec.key !== 'past'" class="block text-sm text-ink-2">
                                            {{ sec.key === 'running' ? 'Ends in' : 'Starts in' }}
                                            <ContestCountdown :target="sec.key === 'running' ? c.endsAt : c.startsAt"
                                                :offset-ms="offsetMs" class="text-sm text-foreground" @elapsed="load" />
                                        </span>
                                    </TableCell>
                                    <TableCell class="hidden text-sm tabular-nums text-ink-2 lg:table-cell">{{ formatContestDate(c.startsAt) }}</TableCell>
                                    <TableCell class="hidden text-sm tabular-nums text-ink-2 lg:table-cell">{{ lengthOf(c) }}</TableCell>
                                    <TableCell class="hidden text-right text-sm tabular-nums text-ink-2 lg:table-cell">{{ c.problemCount }}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </section>
            </div>
        </ListStateShell>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import ContestCountdown from '@/components/contest/ContestCountdown.vue'
import ContestStatus from '@/components/contest/ContestStatus.vue'
import { useFetch } from '@/composables/useFetch'
import contestService from '@/services/contestService'
import { formatContestDate, formatDuration, serverOffsetMs } from '@/lib/contestTime'
import { ROUTE_PATH } from '@/constants/routePath'
import type { ContestSummary } from '@/types/contest'

const { data: list, isLoading, error, execute } = useFetch(contestService.list, { transform: (res) => res.data })
const load = () => void execute()

const lengthOf = (c: ContestSummary) => formatDuration(Date.parse(c.endsAt) - Date.parse(c.startsAt))

const offsetMs = ref(0)
watch(list, (l) => {
    if (l) offsetMs.value = serverOffsetMs(l.serverTime, Date.now())
})

const sections = computed(() => {
    const l = list.value
    if (!l) return []
    return [
        { key: 'running', title: 'Running', phase: 'RUNNING' as const, items: l.running },
        { key: 'upcoming', title: 'Upcoming', phase: 'UPCOMING' as const, items: l.upcoming },
        { key: 'past', title: 'Past', phase: 'ENDED' as const, items: l.past },
    ].filter((s) => s.items.length > 0)
})
const total = computed(() => sections.value.reduce((n, s) => n + s.items.length, 0))
</script>
