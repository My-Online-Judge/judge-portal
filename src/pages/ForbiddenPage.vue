<template>
    <div class="flex flex-col items-start gap-3 px-2 py-12 sm:px-9">
        <span class="mb-1.5 inline-flex items-center gap-1 font-mono" aria-hidden="true">
            <i class="block size-[18px] rounded-[4px] border border-v-ac/60 bg-[color-mix(in_oklch,var(--v-ac)_35%,var(--card))]" />
            <i class="block size-[18px] rounded-[4px] border border-v-ac/60 bg-[color-mix(in_oklch,var(--v-ac)_35%,var(--card))]" />
            <i class="block size-[18px] rounded-[4px] border border-v-ac/60 bg-[color-mix(in_oklch,var(--v-ac)_35%,var(--card))]" />
            <i class="relative block size-[18px] rounded-[4px] border border-v-wa/60 bg-[color-mix(in_oklch,var(--v-wa)_35%,var(--card))]" />
            <span class="ml-2.5 text-[13px] font-semibold text-v-wa-ink">403</span>
        </span>
        <p class="text-xs font-medium text-muted-foreground">Error 403</p>
        <h1 class="text-2xl font-bold tracking-[-0.024em] text-foreground">You don't have access to this page</h1>
        <p v-if="signedIn" class="max-w-[52ch] text-[13.5px] text-muted-foreground">
            You're signed in as <b class="font-semibold text-foreground">{{ username }}</b>. Ask an admin to add the permission you need to your role.
        </p>
        <p v-else class="max-w-[52ch] text-[13.5px] text-muted-foreground">
            You're not signed in. Log in with an account that has access.
        </p>
        <div class="flex flex-wrap gap-2">
            <Button as-child>
                <RouterLink :to="ROUTE_PATH.PROBLEM">Go to problems</RouterLink>
            </Button>
            <Button v-if="signedIn" variant="secondary" @click="loginAsSomeoneElse">Log in as someone else</Button>
            <Button v-else variant="secondary" @click="loginPrompt.request()">Log in</Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ROUTE_PATH } from '@/constants/routePath'
import { useAuthStore } from '@/stores/auth'
import { useLoginPrompt } from '@/composables/useLoginPrompt'

const auth = useAuthStore()
const loginPrompt = useLoginPrompt()
const signedIn = computed(() => auth.user !== null)
const username = computed(() => auth.user?.username ?? 'your account')

const loginAsSomeoneElse = async () => {
    await auth.logout({ reload: false })
    loginPrompt.request()
}
</script>
