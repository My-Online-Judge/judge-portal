<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
        <DialogContent class="sm:max-w-[400px]" @pointer-down-outside.prevent @focus-outside.prevent @escape-key-down.prevent @close="$emit('close')">
            <DialogHeader class="items-center text-center">
                <span class="strip mb-2.5 origin-center scale-[1.4] self-center" aria-hidden="true"><i class="ok" /><i class="ok" /><i class="ok" /><i class="ok" /><i class="p" /><i class="dim" /></span>
                <DialogTitle class="text-center">Log in to My Online Judge</DialogTitle>
                <DialogDescription class="text-center">
                    Track what you've solved and submit from any device.
                </DialogDescription>
            </DialogHeader>

            <div class="grid gap-3 pt-2">
                <Button variant="secondary" size="lg" class="w-full" :aria-busy="loading" :disabled="loading" @click="handleGoogleLogin">
                    <Loader2 v-if="loading" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    <svg v-else class="size-[18px]" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
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
import { CircleAlert, Loader2 } from 'lucide-vue-next'
import authService from '@/services/authService'

defineProps<{
    open: boolean
}>()

defineEmits(['update:open', 'close'])

const loading = ref(false)
const failed = ref(false)

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
