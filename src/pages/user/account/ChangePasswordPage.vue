<template>
    <div class="flex flex-col gap-6">
        <PageHeader title="Change password" description="You will be signed out and need to log in again." />

        <form class="flex max-w-sm flex-col gap-4" @submit.prevent="handleSubmit">
            <div class="flex flex-col gap-2">
                <Label for="current-password">Current password</Label>
                <Input id="current-password" v-model="currentPassword" type="password"
                    autocomplete="current-password" :disabled="loading" />
            </div>
            <div class="flex flex-col gap-2">
                <Label for="new-password">New password</Label>
                <Input id="new-password" v-model="newPassword" type="password" autocomplete="new-password"
                    :disabled="loading" />
            </div>
            <div class="flex flex-col gap-2">
                <Label for="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" v-model="confirmPassword" type="password"
                    autocomplete="new-password" :disabled="loading" />
            </div>
            <!-- A line is always reserved, so an error does not push the button down. -->
            <p class="min-h-5 text-sm text-destructive-ink" aria-live="polite">{{ error }}</p>
            <Button type="submit" class="self-start"
                :disabled="loading || !currentPassword || !newPassword || !confirmPassword">
                {{ loading ? 'Saving…' : 'Change password' }}
            </Button>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/common/PageHeader.vue'
import userService from '@/services/userService'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from '@/constants/routePath'
import { getErrorMessage } from '@/lib/errorMessage'

const router = useRouter()
const authStore = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
    if (loading.value) return
    error.value = ''
    if (newPassword.value !== confirmPassword.value) {
        error.value = 'New password and confirmation do not match'
        return
    }
    loading.value = true
    try {
        await userService.changeOwnPassword(currentPassword.value, newPassword.value)
    } catch (e: unknown) {
        error.value = getErrorMessage(e, 'Could not change password')
        loading.value = false
        return
    }
    // The server already cleared the cookies; just drop local state.
    await authStore.logout({ reload: false, notifyServer: false })
    await router.push({ path: ROUTE_PATH.ADMIN_LOGIN, query: { redirect: ROUTE_PATH.PROBLEM } })
}
</script>
