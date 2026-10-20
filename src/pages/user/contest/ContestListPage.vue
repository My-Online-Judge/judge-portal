<template>
    <div class="animate-enter flex flex-col gap-[18px]">
        <PageHeader title="Contests"
            description="Timed problem sets, ranked live by problems solved and then by penalty time. Anyone signed in can take part." />

        <div :class="!ready && 'overflow-hidden rounded-xl border border-border bg-card'">
            <ListStateShell :loading="isLoading" :error="error ? 'Check your connection and try again.' : null"
                :has-data="!!list" :empty="total === 0" :rows="4" empty-title="No contests yet"
                empty-hint="Contests appear here once an admin publishes them." @retry="load">
                <div class="flex flex-col gap-6">
                    <section v-for="section in sections" :key="section.key" :aria-labelledby="`contests-${section.key}`"
                        class="flex flex-col gap-2.5">
                        <h2 :id="`contests-${section.key}`" class="flex items-center gap-2 text-sm font-semibold text-foreground">
                            {{ section.title }}
                            <span class="font-mono text-xs font-medium text-muted-foreground">{{ section.items.length }}</span>
                        </h2>
                        <ul class="m-0 list-none overflow-hidden rounded-xl border border-border bg-card p-0">
                            <li v-for="c in section.items" :key="c.slug" class="border-b border-border last:border-b-0">
                                <RouterLink :to="`${ROUTE_PATH.CONTESTS}/${c.slug}`"
                                    class="group flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 outline-none transition-colors hover:bg-accent/55 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                                    <span class="flex min-w-0 flex-1 basis-[240px] flex-col gap-0.5">
                                        <span class="flex min-w-0 items-center gap-2">
                                            <span class="min-w-0 truncate text-[14px] font-semibold text-foreground group-hover:text-link">{{ c.title }}</span>
                                            <Badge v-if="c.status === 'DRAFT'" variant="neutral">Draft</Badge>
                                        </span>
                                        <span class="meta-strip text-xs text-muted-foreground">
                                            <span>{{ formatContestDate(c.startsAt) }}</span>
                                            <span>{{ formatDuration(Date.parse(c.endsAt) - Date.parse(c.startsAt)) }}</span>
                                            <span>{{ c.problemCount === 1 ? '1 problem' : `${c.problemCount} problems` }}</span>
                                        </span>
                                    </span>
                                    <span v-if="section.key !== 'past'" class="text-xs text-muted-foreground">
                                        {{ section.key === 'running' ? 'Ends in' : 'Starts in' }}
                                        <ContestCountdown :target="section.key === 'running' ? c.endsAt : c.startsAt"
                                            :offset-ms="offsetMs" class="text-[13px] text-foreground" @elapsed="load" />
                                    </span>
                                    <Badge v-if="section.key === 'running'" variant="success"><Radio aria-hidden="true" />Live</Badge>
                                </RouterLink>
                            </li>
                        </ul>
                    </section>
                </div>
            </ListStateShell>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Radio } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/common/PageHeader.vue'
import ListStateShell from '@/components/common/ListStateShell.vue'
import ContestCountdown from '@/components/contest/ContestCountdown.vue'
import { useFetch } from '@/composables/useFetch'
import contestService from '@/services/contestService'
import { formatContestDate, formatDuration, serverOffsetMs } from '@/lib/contestTime'
import { ROUTE_PATH } from '@/constants/routePath'

const { data: list, isLoading, error, execute } = useFetch(contestService.list, { transform: (res) => res.data })
const load = () => void execute()

const offsetMs = ref(0)
watch(list, (l) => {
    if (l) offsetMs.value = serverOffsetMs(l.serverTime, Date.now())
})

const sections = computed(() => {
    const l = list.value
    if (!l) return []
    return [
        { key: 'running', title: 'Running', items: l.running },
        { key: 'upcoming', title: 'Upcoming', items: l.upcoming },
        { key: 'past', title: 'Past', items: l.past },
    ].filter((s) => s.items.length > 0)
})
const total = computed(() => sections.value.reduce((n, s) => n + s.items.length, 0))
const ready = computed(() => !!list.value && total.value > 0)
</script>
