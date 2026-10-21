<template>
    <section v-if="items.length" aria-labelledby="upcoming-contests-heading" class="rounded-xl border border-border bg-card p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
            <h3 id="upcoming-contests-heading" class="text-[13.5px] font-semibold text-foreground">Upcoming contests</h3>
            <RouterLink :to="ROUTE_PATH.CONTESTS" class="text-xs font-medium text-link hover:underline">All contests</RouterLink>
        </div>
        <ul class="m-0 flex list-none flex-col divide-y divide-border p-0">
            <li v-for="item in items" :key="item.contest.slug" class="py-2.5 first:pt-0 last:pb-0">
                <RouterLink :to="`${ROUTE_PATH.CONTESTS}/${item.contest.slug}`" class="group flex flex-col gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span class="flex min-w-0 items-center gap-2">
                        <span class="min-w-0 truncate text-[13.5px] font-medium text-foreground group-hover:text-link">{{ item.contest.title }}</span>
                        <Badge v-if="item.live" variant="success"><Radio aria-hidden="true" />Live</Badge>
                    </span>
                    <span class="text-xs text-muted-foreground">
                        {{ item.live ? 'Ends in' : 'Starts in' }}
                        <ContestCountdown :target="item.live ? item.contest.endsAt : item.contest.startsAt" :offset-ms="offsetMs"
                            class="text-foreground" @elapsed="reload" />
                    </span>
                </RouterLink>
            </li>
        </ul>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Radio } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import ContestCountdown from '@/components/contest/ContestCountdown.vue'
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
