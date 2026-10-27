<template>
    <div class="flex flex-col gap-6">
        <PageHeader title="Contests"
            description="Timed problem sets, ranked live by problems solved and then by penalty time. Some are open to everyone signed in; others ask you to register first." />

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
                <!-- Running first, then upcoming, then past (contest enrollment design §5.1). An empty section stays,
                     with one quiet line, so the page keeps its shape between contests. -->
                <section v-for="sec in sections" :key="sec.key" :aria-labelledby="`contests-${sec.key}`"
                    class="flex flex-col gap-2">
                    <h2 :id="`contests-${sec.key}`" class="flex items-baseline gap-2 text-base font-semibold text-foreground">
                        {{ sec.title }}
                        <span class="text-sm font-normal tabular-nums text-muted-foreground">{{ sec.items.length }}</span>
                    </h2>
                    <p v-if="sec.items.length === 0" class="border-t border-rule-2 py-4 text-sm text-ink-2" :data-test="`empty-${sec.key}`">
                        {{ sec.empty }}
                    </p>
                    <!-- The rows sit 12 px outside the column so their text lines up with the page head. Start, length
                         and problem count are columns from lg; under it they sit under the title. -->
                    <div v-else class="-mx-3">
                        <Table>
                            <TableHeader>
                                <TableRow class="hover:bg-transparent">
                                    <TableHead scope="col">Title</TableHead>
                                    <TableHead scope="col" class="w-44 lg:w-48">Status</TableHead>
                                    <TableHead scope="col" class="hidden w-44 lg:table-cell">Start</TableHead>
                                    <TableHead scope="col" class="hidden w-28 lg:table-cell">Duration</TableHead>
                                    <TableHead scope="col" class="hidden w-24 text-right lg:table-cell">Problems</TableHead>
                                    <TableHead scope="col" class="w-36 text-right"><span class="sr-only">Action</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <!-- The whole row opens the contest from a click handler; the title link stays the row's one link
                                     and its tab stop. A ::after overlay on the link would need the row as its containing block, and
                                     WebKit ignores position: relative on a tr, so every overlay would resolve against the table wrapper. -->
                                <TableRow v-for="c in sec.items" :key="c.slug" class="group cursor-pointer" @click="openRow($event, c.slug)">
                                    <TableCell class="whitespace-normal break-words">
                                        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <RouterLink :to="`${ROUTE_PATH.CONTESTS}/${c.slug}`"
                                                class="min-w-0 text-base font-medium text-foreground group-hover:text-primary group-hover:underline">{{ c.title }}</RouterLink>
                                            <Badge v-if="c.status === 'DRAFT'" variant="neutral">Draft</Badge>
                                        </div>
                                        <!-- The kind, in one quiet line (text, no chip), and whether the viewer is in. -->
                                        <p class="mt-0.5 text-sm text-ink-2" data-test="kind">
                                            <template v-if="c.enrollment === 'REQUIRED'">
                                                Registration required, {{ registered(c.enrolledCount) }}
                                            </template>
                                            <template v-else>Open to everyone</template>
                                            <span v-if="c.enrolled" class="ml-2 inline-flex items-center gap-1 text-success-ink">
                                                <Check class="size-3.5" aria-hidden="true" />You are registered
                                            </span>
                                        </p>
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
                                    <TableCell class="py-2 text-right">
                                        <EnrollmentAction :contest="c" size="sm" @changed="load" />
                                    </TableCell>
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
import { RouterLink, useRouter } from 'vue-router'
import { Check } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import ContestCountdown from '@/components/contest/ContestCountdown.vue'
import ContestStatus from '@/components/contest/ContestStatus.vue'
import EnrollmentAction from '@/components/contest/EnrollmentAction.vue'
import contestService from '@/services/contestService'
import { useAuthStore } from '@/stores/auth'
import { useFetch } from '@/composables/useFetch'
import { formatContestDate, formatDuration, serverOffsetMs } from '@/lib/contestTime'
import { ROUTE_PATH } from '@/constants/routePath'
import type { ContestSummary } from '@/types/contest'

const { data: list, isLoading, error, execute } = useFetch(contestService.list, { transform: (res) => res.data })
const load = () => void execute()

// "Log in to register" signs the viewer in on this page: the rows then learn whether they are registered.
const authStore = useAuthStore()
watch(() => authStore.user?.id ?? null, () => load())

const router = useRouter()
// A click anywhere on a row opens its contest, unless the click means something else: another button or a
// modifier (the browser's own open-in-tab gestures), the link or a button inside the row, or a text selection.
const openRow = (e: MouseEvent, slug: string) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if ((e.target as Element).closest('a,button')) return
    if (window.getSelection()?.toString()) return
    void router.push(`${ROUTE_PATH.CONTESTS}/${slug}`)
}

const lengthOf = (c: ContestSummary) => formatDuration(Date.parse(c.endsAt) - Date.parse(c.startsAt))
const registered = (n: number) => (n === 1 ? '1 registered' : `${n} registered`)

const offsetMs = ref(0)
watch(list, (l) => {
    if (l) offsetMs.value = serverOffsetMs(l.serverTime, Date.now())
})

const sections = computed(() => {
    const l = list.value
    if (!l) return []
    return [
        { key: 'running', title: 'Running', phase: 'RUNNING' as const, items: l.running, empty: 'No running contests' },
        { key: 'upcoming', title: 'Upcoming', phase: 'UPCOMING' as const, items: l.upcoming, empty: 'No upcoming contests' },
        { key: 'past', title: 'Past', phase: 'ENDED' as const, items: l.past, empty: 'No past contests yet' },
    ]
})
const total = computed(() => sections.value.reduce((n, s) => n + s.items.length, 0))
</script>
