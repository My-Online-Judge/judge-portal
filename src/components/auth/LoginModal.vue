<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[400px]" @pointer-down-outside="blockWhileLoading" @focus-outside="blockWhileLoading" @escape-key-down="blockWhileLoading" @close="$emit('close')">
            <DialogHeader class="items-center text-center">
                <DialogTitle class="text-center">Log in to My Online Judge</DialogTitle>
                <DialogDescription class="text-center">
                    Track what you've solved and submit from any device.
                </DialogDescription>
            </DialogHeader>

            <div class="grid gap-3 pt-2">
                <Button variant="secondary" size="lg" class="w-full" :aria-busy="loading" :disabled="loading" @click="handleGoogleLogin">
                    <Loader2 v-if="loading" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    <GoogleMark v-else class="size-[18px]" />
                    {{ loading ? 'Opening Google…' : 'Continue with Google' }}
                </Button>

                <div v-if="failed" role="alert" class="flex items-start gap-2 rounded-md bg-destructive-soft px-3 py-2 text-[13px] text-destructive-ink">
                    <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>Couldn't start Google sign-in. Try again.</span>
                </div>
            </div>

            <p class="text-center text-xs text-muted-foreground">
                New here? <b class="font-semibold text-foreground">Continue with Google</b> creates your account.
            </p>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import GoogleMark from '@/components/auth/GoogleMark.vue'
import { CircleAlert, Loader2 } from 'lucide-vue-next'
import authService from '@/services/authService'

defineProps<{
    open: boolean
}>()

defineEmits(['update:open', 'close'])

const loading = ref(false)
const failed = ref(false)

// Esc and outside clicks close the dialog, except while redirecting to Google.
const blockWhileLoading = (e: Event) => {
    if (loading.value) e.preventDefault()
}

const handleGoogleLogin = async () => {
    loading.value = true
    failed.value = false
    try {
        const response = await authService.getGoogleAuthUrl()
        const data = response.data?.data
        if (data && data.url) {
            // Store the CSRF state to verify on the OAuth callback (sessionStorage survives
            // the same-tab redirect to Google and back).
            // The API owns the OAuth callback now and verifies the CSRF state itself,
            // so the SPA only has to remember where to send the user back to.
            localStorage.setItem('loginRedirectUrl', window.location.pathname + window.location.search)
            window.location.href = data.url
        } else {
            throw new Error("Invalid response from server")
        }
    } catch (error) {
        console.error('Failed to get Google Auth URL', error)
        failed.value = true
        loading.value = false
    }
}
</script>
