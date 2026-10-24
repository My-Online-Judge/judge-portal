<template>
    <div class="flex flex-col gap-8">
        <Loading v-if="state === 'loading'" />

        <div v-else-if="state === 'notFound'" class="flex flex-col items-center gap-3 py-20 text-center" role="alert">
            <h1 class="font-display text-2xl text-foreground">User not found</h1>
            <!-- Never echo an email address from the address bar. -->
            <p v-if="routeHandle" class="text-base text-ink-2">No account has the username @{{ routeHandle }}.</p>
            <p v-else class="text-base text-ink-2">This account does not exist.</p>
        </div>

        <div v-else-if="state === 'error'" class="flex flex-col items-center gap-3 py-20 text-center" role="alert">
            <h1 class="font-display text-2xl text-foreground">Could not load this profile</h1>
            <Button variant="outline" size="sm" @click="load">Retry</Button>
        </div>

        <!-- A profile reads best at about 60rem: the strip and the table would only stretch on a wide screen. -->
        <div v-else-if="profile && stats" class="flex max-w-[60rem] flex-col gap-8">
            <header class="flex items-center gap-4">
                <!-- Initials only: a public page never loads a third-party photo, which would tell its host who looks. -->
                <Avatar class="size-16">
                    <AvatarFallback class="bg-primary-soft font-display text-xl text-info-ink">{{ initials }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                    <h1 class="font-display text-2xl break-words text-foreground">{{ heading }}</h1>
                    <p class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-base text-ink-2 [&>*+*]:border-l [&>*+*]:border-rule-2 [&>*+*]:pl-4">
                        <!-- No handle only for an unresolved or legacy email-shaped username; Google accounts have a handle since SP14. -->
                        <span v-if="handle">@{{ handle }}</span>
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
                <h2 id="solved-heading" class="text-base font-semibold text-foreground">Solved problems</h2>
                <ul v-if="stats.solvedProblems.length" class="flex flex-wrap gap-x-5 gap-y-1">
                    <li v-for="slug in stats.solvedProblems" :key="slug">
                        <RouterLink :to="`/problems/${slug}`"
                            class="inline-block rounded-sm py-1.5 font-mono text-sm text-ink-2 transition-colors motion-reduce:transition-none hover:text-link hover:underline">{{ slug }}</RouterLink>
                    </li>
                </ul>
                <p v-else class="text-base text-ink-2">No problems solved yet.</p>
            </section>

            <section aria-labelledby="recent-heading" class="flex flex-col gap-2">
                <h2 id="recent-heading" class="text-base font-semibold text-foreground">Recent submissions</h2>
                <!-- The rows sit 12 px outside the column (8 px on a phone) so their text lines up with the head. Under sm the
                     time and the language sit under the slug, so a row is the problem and its verdict and a slug never wraps. -->
                <div v-if="stats.recent.length" class="-mx-2 sm:-mx-3">
                    <Table>
                        <TableHeader>
                            <TableRow class="hover:bg-transparent">
                                <TableHead scope="col" class="hidden px-3 sm:table-cell">Time</TableHead>
                                <TableHead scope="col" class="px-2 sm:px-3">Problem</TableHead>
                                <TableHead scope="col" class="hidden px-3 sm:table-cell">Language</TableHead>
                                <TableHead scope="col" class="px-2 sm:px-3">Verdict</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="s in stats.recent" :key="s.id" :class="isOwner && 'cursor-pointer'" @click="openDetail(s.id)">
                                <TableCell class="hidden px-3 text-sm text-ink-2 tabular-nums sm:table-cell">
                                    <!-- The owner opens a row from the keyboard through its time. -->
                                    <button v-if="isOwner" type="button" class="relative rounded-sm whitespace-nowrap after:absolute after:inset-x-0 after:-inset-y-3 hover:text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                        :aria-label="`Open submission from ${formatDateTime(s.createdAt)}`" @click.stop="openDetail(s.id)">{{ formatDateTime(s.createdAt) }}</button>
                                    <template v-else>{{ formatDateTime(s.createdAt) }}</template>
                                </TableCell>
                                <TableCell class="px-2 sm:px-3">
                                    <RouterLink :to="`/problems/${s.problemSlug}`"
                                        class="relative rounded-sm font-mono text-sm whitespace-nowrap text-foreground after:absolute after:inset-x-0 after:-inset-y-3 hover:text-link hover:underline" @click.stop>{{ s.problemSlug }}</RouterLink>
                                    <div class="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-2 tabular-nums sm:hidden">
                                        <button v-if="isOwner" type="button" class="relative rounded-sm whitespace-nowrap after:absolute after:inset-x-0 after:-inset-y-3 hover:text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                            :aria-label="`Open submission from ${formatDateTime(s.createdAt)}`" @click.stop="openDetail(s.id)">{{ formatDateTime(s.createdAt) }}</button>
                                        <span v-else class="whitespace-nowrap">{{ formatDateTime(s.createdAt) }}</span>
                                        <span>{{ s.language }}</span>
                                    </div>
                                </TableCell>
                                <TableCell class="hidden px-3 text-sm text-ink-2 sm:table-cell">{{ s.language }}</TableCell>
                                <TableCell class="px-2 sm:px-3"><VerdictChip :status="s.result" /></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                <p v-else class="text-base text-ink-2">No submissions yet.</p>
            </section>

            <SubmissionDetailDialog v-if="isOwner" :open="detailOpen" :submission-id="detailId"
                @update:open="(v: boolean) => (detailOpen = v)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
