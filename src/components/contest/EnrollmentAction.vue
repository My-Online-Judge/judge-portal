<template>
    <!-- The action matrix of the contest enrollment design §5.2: what a viewer can do with a contest right now.
         Text plus one icon for a state, one control for an action; the page decides which control is its primary. -->
    <span v-if="state" data-test="enrollment-action" class="inline-flex flex-wrap items-center gap-2">
        <template v-if="state === 'login'">
            <Button variant="outline" :size="size" @click="loginPrompt.request()">Log in to register</Button>
        </template>

        <template v-else-if="state === 'register'">
            <Button :variant="primary ? 'default' : 'outline'" :size="size" :disabled="busy" @click="register">
                <UserPlus class="size-4" aria-hidden="true" />
                Register
            </Button>
        </template>

        <template v-else-if="state === 'registered'">
            <span class="inline-flex items-center gap-1.5 text-sm font-medium text-success-ink">
                <Check class="size-4" aria-hidden="true" />Registered
            </span>
            <Button v-if="contest.phase === 'UPCOMING'" variant="ghost" :size="size" :disabled="busy" @click="confirming = true">
                Withdraw
            </Button>
            <Button v-else :variant="primary ? 'default' : 'outline'" :size="size" as-child>
                <RouterLink :to="enterTo">Enter</RouterLink>
            </Button>
            <ConfirmDialog v-model:open="confirming" title="Withdraw from this contest?"
                description="You can register again until the contest ends." confirm-label="Withdraw" tone="neutral"
                :busy="busy" @confirm="withdraw" />
        </template>

        <template v-else-if="state === 'enter'">
            <Button :variant="primary ? 'default' : 'outline'" :size="size" as-child>
                <RouterLink :to="enterTo">Enter</RouterLink>
            </Button>
        </template>

        <template v-else-if="state === 'standings'">
            <Button variant="outline" :size="size" as-child>
                <RouterLink :to="`${ROUTE_PATH.CONTESTS}/${contest.slug}?tab=standings`">Standings</RouterLink>
            </Button>
        </template>
    </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, UserPlus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import contestService from '@/services/contestService'
import { useAuthStore } from '@/stores/auth'
import { useLoginPrompt } from '@/composables/useLoginPrompt'
import { useToast } from '@/composables/useToast'
import { getErrorMessage } from '@/lib/errorMessage'
import { ROUTE_PATH } from '@/constants/routePath'
import type { ContestEnrollment, ContestPhase, ContestStatus, EnrollmentState } from '@/types/contest'

/** What the action needs to know about a contest: a list row or the detail both have it. */
export interface EnrollmentActionContest {
    slug: string
    phase: ContestPhase
    status: ContestStatus
    enrollment: ContestEnrollment
    enrolled: boolean
    /** When known, "Enter" opens problem A instead of the contest page. */
    problems?: { label: string }[]
}

const props = withDefaults(defineProps<{
    contest: EnrollmentActionContest
    size?: 'sm' | 'default'
    /** The page's one filled control: Register (or Enter) is filled instead of outlined. */
    primary?: boolean
}>(), { size: 'default', primary: false })

const emit = defineEmits<{ changed: [state: EnrollmentState] }>()

const authStore = useAuthStore()
const loginPrompt = useLoginPrompt()
const { error: errorToast } = useToast()

const busy = ref(false)
const confirming = ref(false)

type State = 'login' | 'register' | 'registered' | 'enter' | 'standings' | null

const state = computed<State>(() => {
    const c = props.contest
    if (c.phase === 'ENDED') return 'standings'
    if (c.enrollment === 'REQUIRED') {
        if (c.enrolled) return 'registered'
        if (!authStore.user) return 'login'
        return 'register'
    }
    return c.phase === 'RUNNING' ? 'enter' : null
})

const enterTo = computed(() => {
    const first = props.contest.problems?.[0]
    return first
        ? `${ROUTE_PATH.CONTESTS}/${props.contest.slug}/problems/${first.label}`
        : `${ROUTE_PATH.CONTESTS}/${props.contest.slug}`
})

const call = async (fn: () => Promise<{ data: { data: EnrollmentState } }>, fallback: string) => {
    if (busy.value) return
    busy.value = true
    try {
        const res = await fn()
        emit('changed', res.data.data)
    } catch (error) {
        errorToast(getErrorMessage(error, fallback))
    } finally {
        busy.value = false
    }
}
const register = () => call(() => contestService.enroll(props.contest.slug), "Couldn't register you")
const withdraw = async () => {
    await call(() => contestService.withdraw(props.contest.slug), "Couldn't withdraw your registration")
    confirming.value = false
}
</script>
