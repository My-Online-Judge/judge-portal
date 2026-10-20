<template>
    <DialogRoot v-model:open="open">
        <DialogTrigger as-child>
            <Button variant="ghost" size="icon-sm" class="-ml-1.5 md:hidden" aria-label="Open menu">
                <Menu />
            </Button>
        </DialogTrigger>
        <DialogPortal>
            <DialogOverlay
                class="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
            <DialogContent aria-label="Navigation" :aria-describedby="undefined"
                class="fixed inset-y-0 left-0 z-50 flex h-full w-[272px] max-w-[85vw] flex-col gap-3.5 border-r border-border bg-card px-2.5 py-3 shadow-[var(--shadow-lg)] outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left motion-reduce:animate-none">
                <DialogTitle class="sr-only">Navigation</DialogTitle>
                <div class="flex items-center gap-2 px-2 pt-1 pb-1.5">
                    <RouterLink to="/problems"
                        class="flex items-center gap-[9px] rounded-md text-[15px] font-bold tracking-[-0.03em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="My Online Judge, problems" @click="open = false">
                        <span class="strip" aria-hidden="true"><i class="ok" /><i class="ok" /><i class="ok" /><i class="ok" /><i class="p" /><i class="dim" /></span>
                        <span>MOJ</span>
                    </RouterLink>
                    <DialogClose as-child>
                        <Button variant="ghost" size="icon-sm" class="ml-auto" aria-label="Close menu">
                            <X />
                        </Button>
                    </DialogClose>
                </div>
                <nav aria-label="Main" class="flex flex-col gap-px">
                    <RouterLink v-for="item in items" :key="item.to" :to="item.to"
                        class="flex h-10 items-center gap-2.5 rounded-[7px] px-2.5 text-[13.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        active-class="!bg-primary-soft !font-semibold !text-info-ink" @click="open = false">
                        <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
                        {{ item.label }}
                    </RouterLink>
                </nav>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>

<script setup lang="ts">
import { ref, watch, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { Menu, X } from 'lucide-vue-next'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger } from 'reka-ui'
import { Button } from '@/components/ui/button'

// Header's navItems: the sheet shows exactly what the desktop nav shows.
defineProps<{
    items: { to: string; label: string; icon: Component }[]
}>()

const open = ref(false)
// Close on any navigation, including the back button; a tap on the current page's link closes it too.
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))
// From md the desktop nav shows, so a sheet left open would be a second "Main" navigation landmark: close it.
const isMd = useMediaQuery('(min-width: 768px)')
watch(isMd, (md) => {
    if (md) open.value = false
})
</script>
