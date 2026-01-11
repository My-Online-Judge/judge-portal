<template>
    <Transition enter-active-class="transition ease-out duration-300" enter-from-class="transform opacity-0 -translate-y-2"
        enter-to-class="transform opacity-100 translate-y-0" leave-active-class="transition ease-in duration-200"
        leave-from-class="transform opacity-100 translate-y-0" leave-to-class="transform opacity-0 -translate-y-2">
        <div v-if="showToast" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div class="bg-white px-4 py-2 rounded-lg shadow-lg border border-slate-100 flex items-center gap-2">
                <div :class="currentConfig.colorClass" class="rounded-full p-0.5 flex items-center justify-center">
                    <component :is="currentConfig.icon" class="h-3 w-3 text-white" />
                </div>
                <span class="text-slate-700 font-medium text-sm">{{ toastMessage }}</span>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { useToast, type ToastType } from '@/composables/useToast'
import { Check, Info, AlertTriangle, XCircle, type LucideIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const { showToast, toastMessage, toastType } = useToast()

const config: Record<ToastType, { icon: LucideIcon; colorClass: string }> = {
    success: { icon: Check, colorClass: 'bg-emerald-500' },
    info: { icon: Info, colorClass: 'bg-blue-500' },
    warning: { icon: AlertTriangle, colorClass: 'bg-amber-500' },
    error: { icon: XCircle, colorClass: 'bg-rose-500' }
}

const currentConfig = computed(() => config[toastType.value] || config.success)
</script>
