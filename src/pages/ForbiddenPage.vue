<template>
    <div class="flex flex-col items-start gap-4 py-12">
        <h1 class="font-display text-2xl text-foreground">You don't have access to this page</h1>
        <p v-if="signedIn" class="max-w-[52ch] text-base text-muted-foreground">
            You're signed in as <b class="font-semibold text-foreground">{{ username }}</b>. Ask an admin to add the permission you need to your role.
        </p>
        <p v-else class="max-w-[52ch] text-base text-muted-foreground">
            You're not signed in. Log in with an account that has access.
        </p>
        <p class="text-sm text-muted-foreground">Error 403</p>
        <div class="flex flex-wrap gap-2">
            <Button as-child variant="outline">
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
