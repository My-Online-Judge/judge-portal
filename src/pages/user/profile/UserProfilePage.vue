<template>
    <div class="mx-auto flex w-full max-w-[60rem] flex-col gap-6 px-4 py-8 md:px-6">
        <Loading v-if="state === 'loading'" />

        <div v-else-if="state === 'notFound'" class="rounded-xl border bg-card p-10 text-center" role="alert">
            <h1 class="text-lg font-semibold">User not found</h1>
            <!-- Never echo an email address from the address bar. -->
            <p v-if="routeHandle" class="mt-1 text-sm text-muted-foreground">No account has the username @{{ routeHandle }}.</p>
            <p v-else class="mt-1 text-sm text-muted-foreground">This account does not exist.</p>
        </div>

        <div v-else-if="state === 'error'" class="rounded-xl border bg-card p-10 text-center" role="alert">
            <h1 class="text-lg font-semibold">Could not load this profile</h1>
            <Button variant="outline" size="sm" class="mt-3" @click="load">Retry</Button>
        </div>

        <template v-else-if="profile && stats">
            <header class="flex items-center gap-4">
                <Avatar class="size-16">
                    <AvatarImage v-if="profile.avatar" :src="profile.avatar" :alt="heading" />
                    <AvatarFallback class="bg-primary-soft text-lg font-semibold text-info-ink">{{ initials }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                    <h1 class="truncate text-xl font-semibold tracking-[-0.02em]">{{ heading }}</h1>
                    <p class="text-sm text-muted-foreground">
                        <!-- A Google account has no public username: its username is its email address. -->
                        <span v-if="handle" class="mr-2 font-mono">@{{ handle }}</span>
                        <span>Joined {{ joined }}</span>
                    </p>
                </div>
            </header>

            <StatStrip :cols="3">
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
                                <td class="pl-4 font-mono text-xs whitespace-nowrap">
                                    <!-- The owner opens a row from the keyboard through its time. -->
                                    <button v-if="isOwner" type="button" class="rounded-sm hover:text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                        :aria-label="`Open submission from ${formatDateTime(s.createdAt)}`" @click.stop="openDetail(s.id)">{{ formatDateTime(s.createdAt) }}</button>
                                    <template v-else>{{ formatDateTime(s.createdAt) }}</template>
                                </td>
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
import { publicHandle, publicName } from '@/lib/publicName'
import type { PublicProfile, UserStats } from '@/types/profile'

// Only an owner can open a row, so the dialog (and its verdict tiles) loads on demand.
const SubmissionDetailDialog = defineAsyncComponent(() => import('@/components/problem/detail/SubmissionDetailDialog.vue'))

const route = useRoute()
const authStore = useAuthStore()

// Two routes: /u/:username, and /u/id/:id for an account without a public username.
const username = computed(() => String(route.params.username ?? ''))
const userId = computed(() => String(route.params.id ?? ''))
const routeKey = computed(() => (userId.value ? `id:${userId.value}` : `username:${username.value}`))
const routeHandle = computed(() => publicHandle(username.value))
const state = ref<'loading' | 'ready' | 'notFound' | 'error'>('loading')
const profile = ref<PublicProfile | null>(null)
const stats = ref<UserStats | null>(null)
const detailOpen = ref(false)
const detailId = ref<string | null>(null)

const isOwner = computed(() => !!profile.value && authStore.user?.id === profile.value.id)
const handle = computed(() => publicHandle(profile.value?.username))
// The name, or "Contestant" and the start of the id; never an email address.
const heading = computed(() => (profile.value ? publicName({ id: profile.value.id, name: profile.value.name }) : ''))

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
    const parts = heading.value.trim().split(/\s+/).filter(Boolean)
    if (parts.length > 1) return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
    return (parts[0] ?? '').slice(0, 2).toUpperCase()
})

let seq = 0
// The signed-in user the shown stats were read for; undefined until a load has asked.
let viewer: string | null | undefined
const load = async () => {
    const mine = ++seq
    state.value = 'loading'
    detailOpen.value = false
    try {
        // Right after a reload the header's /auth/me may still be on its way: wait for it, so the owner gets the owner view.
        await authStore.ensureLoaded()
        if (mine !== seq) return
        viewer = authStore.user?.id ?? null
        const read = userId.value
            ? userService.getPublicProfilesByIds([userId.value]).then((res) => res.data.data[0] ?? null)
            : userService.getPublicProfile(username.value).then((res) => res.data.data)
        const p = await read.catch((err) => {
            // Only the profile's 404 (or a malformed id's 400) means there is no such user; a stats failure is an
            // error to retry.
            const status = isAxiosError(err) ? err.response?.status : undefined
            if (status === 404 || (userId.value && status === 400)) return null
            throw err
        })
        if (mine !== seq) return
        if (!p) {
            state.value = 'notFound'
            return
        }
        // The owner view of the stats depends on the access cookie, so refresh it first when signed in.
        if (authStore.user) await ensureFreshSession()
        const s = (await submissionService.getUserStats(p.id)).data.data
        if (mine !== seq) return
        profile.value = p
        stats.value = s
        state.value = 'ready'
    } catch {
        if (mine !== seq) return
        state.value = 'error'
    }
}

const openDetail = (id: string) => {
    if (!isOwner.value) return
    detailId.value = id
    detailOpen.value = true
}

watch(routeKey, load, { immediate: true })
// A login or logout on the page changes whose view the stats are: read them again. A load still waiting for the
// session reads the new user itself.
watch(
    () => authStore.user?.id ?? null,
    (id) => {
        if (viewer !== undefined && id !== viewer) void load()
    },
)
</script>
