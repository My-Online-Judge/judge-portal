<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[400px]" @pointer-down-outside="blockWhileLoading" @focus-outside="blockWhileLoading" @escape-key-down="blockWhileLoading" @close="$emit('close')">
            <DialogHeader class="text-left">
                <DialogTitle class="font-display text-xl">Log in to My Online Judge</DialogTitle>
                <DialogDescription class="text-base text-ink-2">
                    Track what you've solved and submit from any device.
                </DialogDescription>
            </DialogHeader>

            <div class="flex flex-col gap-2">
                <!-- The dialog's one action, so its one filled button. Google's mark keeps its own colours, so it sits on a
                     paper tile that stays legible on the blue. -->
                <Button size="lg" class="w-full" :aria-busy="loading" :disabled="loading" @click="handleGoogleLogin">
                    <Loader2 v-if="loading" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    <span v-else class="grid size-6 place-items-center rounded-sm bg-background">
                        <GoogleMark class="size-4" />
                    </span>
                    {{ loading ? 'Opening Google…' : 'Continue with Google' }}
                </Button>

                <!-- A line is always reserved, so a failure does not move the dialog. -->
                <div role="alert" class="flex min-h-5 items-start gap-2 text-sm text-destructive-ink">
                    <template v-if="failed">
                        <CircleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span>Couldn't start Google sign-in. Try again.</span>
                    </template>
                </div>

                <p class="text-sm text-ink-2">
                    New here? <b class="font-semibold text-foreground">Continue with Google</b> creates your account.
                </p>
            </div>
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
