<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, type HTMLAttributes } from 'vue'
import { injectAvatarRootContext } from 'reka-ui'
import { cn } from '@/lib/utils'

type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error'

// An avatar is a third-party URL (a Google photo): neither the image nor its preload may tell that host which page
// the viewer is on. reka-ui's AvatarImage renders the policy as a `referrer-policy` attribute the browser ignores and
// sets it on its preload only after the src, so this component renders the <img> and runs the preload itself, and
// reports the loading status to the Avatar root so AvatarFallback keeps working.
const props = withDefaults(
    defineProps<{ src: string; referrerPolicy?: ReferrerPolicy; class?: HTMLAttributes['class'] }>(),
    { referrerPolicy: 'no-referrer' },
)

const root = injectAvatarRootContext()
const status = ref<ImageLoadingStatus>('idle')
watch(status, (s) => {
    if (s !== 'idle') root.imageLoadingStatus.value = s
}, { immediate: true })

let mounted = false
let preload: HTMLImageElement | null = null
const settle = (s: ImageLoadingStatus) => () => {
    if (mounted) status.value = s
}

const load = () => {
    if (!preload) {
        preload = new window.Image()
        preload.addEventListener('load', settle('loaded'))
        preload.addEventListener('error', settle('error'))
    }
    // The policy goes on before the src, so the first request already carries it.
    preload.referrerPolicy = props.referrerPolicy
    if (!props.src) {
        status.value = 'error'
        return
    }
    if (preload.getAttribute('src') !== props.src) preload.src = props.src
    status.value = preload.complete && preload.naturalWidth > 0 ? 'loaded' : 'loading'
}

onMounted(() => {
    mounted = true
    load()
})
watch(() => [props.src, props.referrerPolicy], () => {
    if (mounted) load()
})
onUnmounted(() => {
    mounted = false
})
</script>

<template>
    <img v-show="status === 'loaded'" :referrerpolicy="props.referrerPolicy" :src="props.src"
        :class="cn('aspect-square h-full w-full rounded-[inherit]', props.class)">
</template>
