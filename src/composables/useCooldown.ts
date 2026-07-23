import { computed, ref } from 'vue'

/**
 * A simple seconds countdown for cooldown UX (e.g. the submit button).
 * start(n) (re)starts it; `active` flips false when it reaches zero.
 */
export function useCooldown() {
    const remaining = ref(0)
    let timer: ReturnType<typeof setInterval> | undefined

    function stop() {
        if (timer) {
            clearInterval(timer)
            timer = undefined
        }
    }

    function start(seconds: number) {
        stop()
        remaining.value = Math.max(0, Math.ceil(seconds))
        if (remaining.value === 0) return
        timer = setInterval(() => {
            remaining.value -= 1
            if (remaining.value <= 0) {
                remaining.value = 0
                stop()
            }
        }, 1000)
    }

    const active = computed(() => remaining.value > 0)

    return { remaining, active, start, stop }
}
