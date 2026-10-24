<template>
    <section v-if="items.length" aria-labelledby="upcoming-contests-heading">
        <div class="flex items-baseline justify-between gap-2 pb-2">
            <h2 id="upcoming-contests-heading" class="text-sm font-medium text-foreground">Upcoming contests</h2>
            <RouterLink :to="ROUTE_PATH.CONTESTS" class="text-sm text-link hover:underline">All contests</RouterLink>
        </div>
        <ul class="m-0 flex list-none flex-col p-0">
            <li v-for="item in items" :key="item.contest.slug">
                <RouterLink :to="`${ROUTE_PATH.CONTESTS}/${item.contest.slug}`" class="group flex flex-col gap-0.5 rounded-sm px-2 py-1.5 transition-colors motion-reduce:transition-none hover:bg-muted">
                    <span class="flex min-w-0 items-start justify-between gap-2">
                        <span class="min-w-0 text-sm font-medium text-foreground group-hover:text-primary">{{ item.contest.title }}</span>
                        <!-- The same status as the contests pages: text and one icon in the accent ink, at the rail's size. -->
                        <ContestStatus v-if="item.live" phase="RUNNING" class="shrink-0 text-sm" />
                    </span>
                    <span class="text-sm tabular-nums text-muted-foreground">
                        {{ item.live ? 'Ends in' : 'Starts in' }}
                        <ContestCountdown :target="item.live ? item.contest.endsAt : item.contest.startsAt" :offset-ms="offsetMs"
                            class="text-sm text-foreground" @elapsed="reload" />
                    </span>
                </RouterLink>
            </li>
        </ul>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ContestCountdown from '@/components/contest/ContestCountdown.vue'
import ContestStatus from '@/components/contest/ContestStatus.vue'
import { useFetch } from '@/composables/useFetch'
import contestService from '@/services/contestService'
import { serverOffsetMs } from '@/lib/contestTime'
import { ROUTE_PATH } from '@/constants/routePath'
import type { ContestSummary } from '@/types/contest'

// The sidebar card on /problems: running contests first, then the next ones, at most 3. Nothing shows when there is
// nothing to show, or when the list cannot be read.
const MAX_ITEMS = 3

const { data: list, execute } = useFetch(contestService.list, { transform: (res) => res.data })

const offsetMs = ref(0)
watch(list, (l) => {
    if (l) offsetMs.value = serverOffsetMs(l.serverTime, Date.now())
})

// A contest editor's list carries drafts too; this card is the public view, so it shows published contests only.
const published = (c: ContestSummary) => c.status === 'PUBLISHED'
const items = computed(() => {
    const l = list.value
    if (!l) return []
    return [
        ...l.running.filter(published).map((contest) => ({ contest, live: true })),
        ...l.upcoming.filter(published).map((contest) => ({ contest, live: false })),
    ].slice(0, MAX_ITEMS)
})

// A countdown reached its end: a contest started or finished, so read the list again.
const reload = () => void execute()
</script>
