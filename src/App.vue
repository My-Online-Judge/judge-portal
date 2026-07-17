<template>
  <!-- Admin renders its own full-height shell — no site Header/footer/max-width chrome. -->
  <RouterView v-if="isAdmin" />

  <div v-else class="flex min-h-screen flex-col bg-background text-foreground">
    <Header />

    <main class="mx-auto w-full max-w-[84rem] flex-1 px-4 py-8 md:px-6 lg:px-8">
      <RouterView />
    </main>

    <footer class="border-t border-border py-8 text-center">
      <p class="text-sm text-muted-foreground">MyOJ — practice, submit, get judged in real time.</p>
      <p class="mt-1 text-xs text-muted-foreground/60">© {{ new Date().getFullYear() }} MyOJ</p>
    </footer>
  </div>

  <Toaster />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import Header from '@/components/layout/Header.vue'
import Toaster from '@/components/ui/toast/Toaster.vue'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const { triggerToast } = useToast()
const isAdmin = computed(() => route.path.startsWith('/admin'))

// The API completes the Google login server-side and sends the browser back here
// with ?login=ok|failed. Report the outcome, drop the marker so a refresh doesn't
// repeat it, then return the user to the page they signed in from.
onMounted(() => {
    const params = new URLSearchParams(window.location.search)
    const login = params.get('login')
    if (!login) return

    params.delete('login')
    const query = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''))

    const back = localStorage.getItem('loginRedirectUrl')
    localStorage.removeItem('loginRedirectUrl')

    if (login !== 'ok') {
        triggerToast('Login failed. Please try again.', 'error')
        return
    }

    triggerToast('Signed in', 'success')
    if (back && back !== window.location.pathname + window.location.search) {
        router.replace(back)
    }
})
</script>
