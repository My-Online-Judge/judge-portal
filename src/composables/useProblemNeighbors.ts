import { computed, ref, watch, type Ref } from 'vue'
import problemService from '@/services/problemService'
import { ROUTE_PATH } from '@/constants/routePath'
import type { ContestDetail } from '@/types/contest'

export interface Neighbor {
    to: string
    title: string
}

// The practice list in the order the Problems page shows it, read once per page load and shared by every problem page.
const PAGE_SIZE = 100
let practiceOrder: Promise<{ slug: string; title: string }[]> | null = null
const loadPracticeOrder = () => {
    practiceOrder ??= Promise.resolve()
        .then(() => problemService.getProblems(undefined, { page: 0, size: PAGE_SIZE }))
        .then((res) => res.data.data.map((p) => ({ slug: p.problemSlug, title: p.title })))
        .catch(() => {
            practiceOrder = null // a later page may try again
            return []
        })
    return practiceOrder
}

/** For tests: forget the cached practice order. */
export const resetProblemNeighbors = () => {
    practiceOrder = null
}

/**
 * The problems before and after this one: in a contest, by the contest's labels; in practice, by the Problems list's
 * order (its first page). Null at either end, or while the order is unknown.
 */
export function useProblemNeighbors(opts: {
    contestSlug: Ref<string>
    label: Ref<string>
    slug: Ref<string>
    contest: Ref<ContestDetail | null>
}) {
    const practice = ref<{ slug: string; title: string }[]>([])

    watch(
        () => (opts.contestSlug.value ? '' : opts.slug.value),
        async (slug) => {
            if (!slug) return
            practice.value = await loadPracticeOrder()
        },
        { immediate: true },
    )

    const around = computed<{ prev: Neighbor | null; next: Neighbor | null }>(() => {
        if (opts.contestSlug.value) {
            const list = opts.contest.value?.problems ?? []
            const at = list.findIndex((p) => p.label === opts.label.value)
            const link = (i: number): Neighbor | null => {
                const p = at < 0 ? undefined : list[i]
                return p ? { to: `${ROUTE_PATH.CONTESTS}/${opts.contestSlug.value}/problems/${p.label}`, title: `${p.label}. ${p.title}` } : null
            }
            return { prev: link(at - 1), next: link(at + 1) }
        }
        const list = practice.value
        const at = list.findIndex((p) => p.slug === opts.slug.value)
        const link = (i: number): Neighbor | null => {
            const p = at < 0 ? undefined : list[i]
            return p ? { to: `${ROUTE_PATH.PROBLEM}/${p.slug}`, title: p.title } : null
        }
        return { prev: link(at - 1), next: link(at + 1) }
    })

    return {
        prev: computed(() => around.value.prev),
        next: computed(() => around.value.next),
    }
}
