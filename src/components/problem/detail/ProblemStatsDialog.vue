<template>
    <Dialog>
        <DialogTrigger as-child>
            <slot />
        </DialogTrigger>
        <DialogContent class="gap-0 overflow-hidden p-0 sm:max-w-[520px]">
            <DialogHeader class="gap-1 px-5 pt-[18px] pr-12 pb-4 text-left">
                <DialogTitle class="text-base leading-snug font-semibold">{{ problem.title }}</DialogTitle>
                <DialogDescription class="text-[13px]">{{ submissionsLabel }}, by verdict</DialogDescription>
            </DialogHeader>

            <div class="px-5 pb-5">
                <div v-if="!total" class="flex h-40 items-center justify-center text-sm text-muted-foreground">
                    No submissions yet
                </div>
                <div v-else class="flex flex-wrap items-center gap-5">
                    <div class="relative size-[168px] flex-none">
                        <Doughnut :data="chartData" :options="chartOptions" :aria-label="chartLabel" />
                        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
                            aria-hidden="true">
                            <b class="tabular font-mono text-[22px] leading-tight font-semibold tracking-[-0.03em]">{{ acceptedPct }}%</b>
                            <span class="text-[11.5px] text-muted-foreground">accepted of {{ total }}</span>
                        </div>
                    </div>
                    <table class="min-w-0 flex-[1_1_200px] border-collapse text-[12.5px]">
                        <caption class="sr-only">Submissions by verdict</caption>
                        <thead class="sr-only">
                            <tr>
                                <th scope="col">Verdict</th>
                                <th scope="col">Submissions</th>
                                <th scope="col">Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in rows" :key="row.status" class="border-b border-border last:border-b-0">
                                <td class="px-1.5 py-1 whitespace-nowrap">
                                    <span class="inline-flex items-center gap-2">
                                        <span class="size-2.5 flex-none rounded-[3px]" :style="{ backgroundColor: row.color }"
                                            aria-hidden="true" />
                                        <VerdictChip v-if="row.status !== OTHER_VERDICTS" :status="row.status" size="sm"
                                            aria-hidden="true" />
                                        {{ row.name }}
                                    </span>
                                </td>
                                <td class="tabular px-1.5 py-1 text-right font-mono">{{ row.count }}</td>
                                <td class="tabular px-1.5 py-1 text-right font-mono text-muted-foreground">{{ row.pct }}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <DialogFooter class="items-center border-t bg-muted/55 px-5 py-3.5 sm:justify-between">
                <span class="text-xs text-muted-foreground">Counts update when a submission is judged.</span>
                <DialogClose as-child>
                    <Button variant="secondary">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { Chart as ChartJS, ArcElement, DoughnutController, type ChartData, type ChartOptions } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import VerdictChip from '@/components/common/VerdictChip.vue'
import { useTheme } from '@/composables/useTheme'
import { OTHER_VERDICTS, verdictSlices } from '@/lib/problemStats'
import { verdictMeta, type VerdictTone } from '@/lib/verdict'
import type { Problem } from '@/types/problem'

ChartJS.register(ArcElement, DoughnutController)

const props = defineProps<{ problem: Problem }>()

const { isDark } = useTheme()
const reducedMotion = usePreferredReducedMotion()

const total = computed(() => props.problem.totalSubmission || 0)
const share = (count: number) => (total.value ? ((count / total.value) * 100).toFixed(1) : '0.0')
const acceptedPct = computed(() => share(props.problem.acceptedSubmission || 0))
const submissionsLabel = computed(() => `${total.value} ${total.value === 1 ? 'submission' : 'submissions'}`)
const chartLabel = computed(
    () => `Submissions by verdict, ${total.value} total. Accepted ${acceptedPct.value} percent.`,
)

// Chart colors are the verdict mark tokens, read from the page. They differ per theme, so read them again
// when the theme flips.
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const palette = computed(() => {
    void isDark.value
    return { tone: (tone: VerdictTone) => cssVar(`--v-${tone}`), card: cssVar('--card') }
})

const rows = computed(() => {
    const slices = verdictSlices(
        props.problem.statisticInfo as Record<string, number> | undefined,
        total.value,
        props.problem.acceptedSubmission || 0,
    )
    return slices.map(({ status, count }) => {
        const other = status === OTHER_VERDICTS
        const meta = verdictMeta(status)
        return {
            status,
            count,
            name: other ? 'Other verdicts' : meta.name,
            color: palette.value.tone(other ? 'pending' : meta.tone),
            pct: share(count),
        }
    })
})

const chartData = computed<ChartData<'doughnut'>>(() => {
    const colors = rows.value.map((r) => r.color)
    return {
        labels: rows.value.map((r) => r.name),
        datasets: [{
            data: rows.value.map((r) => r.count),
            backgroundColor: colors,
            hoverBackgroundColor: colors,
            borderColor: palette.value.card,
            hoverBorderColor: palette.value.card,
            borderWidth: 2,
        }],
    }
})

// A static ring: the table beside it lists every value, so no tooltip, legend or hover.
const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    events: [],
    ...(reducedMotion.value === 'reduce' ? { animation: false as const } : {}),
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
    },
}))
</script>
