<template>
    <div class="mx-auto flex w-full max-w-[60rem] flex-col gap-6 px-4 py-8 md:px-6">
        <Loading v-if="state === 'loading'" />

        <div v-else-if="state === 'notFound'" class="rounded-xl border bg-card p-10 text-center" role="alert">
            <h1 class="text-lg font-semibold">User not found</h1>
            <p class="mt-1 text-sm text-muted-foreground">No account has the username @{{ username }}.</p>
        </div>

        <div v-else-if="state === 'error'" class="rounded-xl border bg-card p-10 text-center" role="alert">
            <h1 class="text-lg font-semibold">Could not load this profile</h1>
            <Button variant="outline" size="sm" class="mt-3" @click="load">Retry</Button>
        </div>

        <template v-else-if="profile && stats">
            <header class="flex items-center gap-4">
                <Avatar class="size-16">
                    <AvatarImage v-if="profile.avatar" :src="profile.avatar" :alt="profile.username" />
                    <AvatarFallback class="bg-primary-soft text-lg font-semibold text-info-ink">{{ initials }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                    <h1 class="truncate text-xl font-semibold tracking-[-0.02em]">{{ profile.name }}</h1>
                    <p class="text-sm text-muted-foreground">
                        <span class="font-mono">@{{ profile.username }}</span>
                        <span class="ml-2">Joined {{ joined }}</span>
                    </p>
                </div>
            </header>

            <StatStrip class="!grid-cols-3">
                <StatCell data-test="tile-solved" label="Solved" :value="stats.solvedCount" />
                <StatCell data-test="tile-attempted" label="Attempted" :value="stats.attemptedCount" />
                <StatCell data-test="tile-acceptance" label="Acceptance" :value="acceptance" />
            </StatStrip>

            <section aria-labelledby="solved-heading" class="flex flex-col gap-3">
                <h2 id="solved-heading" class="text-sm font-semibold">Solved problems</h2>
                <ul v-if="stats.solvedProblems.length" class="flex flex-wrap gap-2">
                    <li v-for="slug in stats.solvedProblems" :key="slug">
                        <RouterLink :to="`/problems/${slug}`"
                            class="inline-flex rounded-md bg-success-soft px-2 py-1 font-mono text-xs text-success-ink hover:underline">{{ slug }}</RouterLink>
                    </li>
                </ul>
                <p v-else class="text-sm text-muted-foreground">No problems solved yet.</p>
            </section>

            <section aria-labelledby="recent-heading" class="flex flex-col gap-3">
                <h2 id="recent-heading" class="text-sm font-semibold">Recent submissions</h2>
                <div v-if="stats.recent.length" class="overflow-x-auto rounded-xl border bg-card">
                    <table class="dt min-w-[480px]">
                        <thead>
                            <tr>
                                <th class="pl-4">Time</th>
                                <th>Problem</th>
                                <th>Language</th>
                                <th>Verdict</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="s in stats.recent" :key="s.id" :class="isOwner && 'cursor-pointer'" @click="openDetail(s.id)">
                                <td class="pl-4 font-mono text-xs whitespace-nowrap">{{ formatDateTime(s.createdAt) }}</td>
                                <td>
                                    <RouterLink :to="`/problems/${s.problemSlug}`"
                                        class="font-mono text-xs text-foreground hover:text-link hover:underline" @click.stop>{{ s.problemSlug }}</RouterLink>
                                </td>
                                <td class="text-[13px] whitespace-nowrap">{{ s.language }}</td>
                                <td><VerdictChip :status="s.result" size="sm" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-else class="text-sm text-muted-foreground">No submissions yet.</p>
            </section>

            <SubmissionDetailDialog v-if="isOwner" :open="detailOpen" :submission-id="detailId"
                @update:open="(v: boolean) => (detailOpen = v)" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Loading from '@/components/common/Loading.vue'
import StatCell from '@/components/common/StatCell.vue'
import StatStrip from '@/components/common/StatStrip.vue'
import VerdictChip from '@/components/common/VerdictChip.vue'
import userService from '@/services/userService'
import submissionService from '@/services/submissionService'
import { ensureFreshSession } from '@/api/refreshSession'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime } from '@/utils/dateTimeUtils'
import type { PublicProfile, UserStats } from '@/types/profile'

// Only an owner can open a row, so the dialog (and its verdict tiles) loads on demand.
const SubmissionDetailDialog = defineAsyncComponent(() => import('@/components/problem/detail/SubmissionDetailDialog.vue'))

const route = useRoute()
const authStore = useAuthStore()

const username = computed(() => String(route.params.username ?? ''))
const state = ref<'loading' | 'ready' | 'notFound' | 'error'>('loading')
const profile = ref<PublicProfile | null>(null)
const stats = ref<UserStats | null>(null)
const detailOpen = ref(false)
const detailId = ref<string | null>(null)

const isOwner = computed(() => !!profile.value && authStore.user?.id === profile.value.id)

const acceptance = computed(() => {
    const s = stats.value
    if (!s || s.submissionCount <= 0) return '0%'
    return `${((s.acceptedCount / s.submissionCount) * 100).toFixed(1)}%`
})

const joined = computed(() =>
    profile.value
        ? new Date(profile.value.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '',
)

const initials = computed(() => {
    const parts = (profile.value?.name || profile.value?.username || '').trim().split(/\s+/).filter(Boolean)
    if (parts.length > 1) return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
    return (parts[0] ?? '').slice(0, 2).toUpperCase()
})

let seq = 0
const load = async () => {
    const mine = ++seq
    state.value = 'loading'
    detailOpen.value = false
    try {
        const p = (await userService.getPublicProfile(username.value)).data.data
        // The owner view of the stats depends on the access cookie, so refresh it first when signed in.
        if (authStore.user) await ensureFreshSession()
        const s = (await submissionService.getUserStats(p.id)).data.data
        if (mine !== seq) return
        profile.value = p
        stats.value = s
        state.value = 'ready'
    } catch (err) {
        if (mine !== seq) return
        state.value = isAxiosError(err) && err.response?.status === 404 ? 'notFound' : 'error'
    }
}

const openDetail = (id: string) => {
    if (!isOwner.value) return
    detailId.value = id
    detailOpen.value = true
}

watch(username, load, { immediate: true })
</script>
