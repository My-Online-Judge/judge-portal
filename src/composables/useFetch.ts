import { ref, onMounted, onUnmounted, shallowRef, type Ref } from 'vue'
import axios, { type AxiosResponse, type AxiosError } from 'axios'

interface UseFetchOptions<T, R = T> {
    immediate?: boolean
    params?: unknown // Can be array of args or single arg
    transform?: (data: T) => R
}

interface UseFetchState<R> {
    data: Ref<R | null>
    error: Ref<AxiosError | null>
    isLoading: Ref<boolean>
    execute: (...args: unknown[]) => Promise<void>
    abort: () => void
}

/**
 * useFetch expects a service function where the FIRST argument is AbortSignal.
 * This allows for optional trailing arguments in the service function.
 * 
 * Example: serviceFn(signal, param1, param2)
 */
export function useFetch<T = unknown, R = T>(
    // Service functions have varied, concretely-typed trailing args (slug, id, …);
    // `any[]` is the only signature every real service stays assignable to here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serviceFn: (signal: AbortSignal, ...args: any[]) => Promise<AxiosResponse<T>>,
    options: UseFetchOptions<T, R> = {}
): UseFetchState<R> {
    const { immediate = true, params, transform } = options

    const data = shallowRef<R | null>(null)
    const error = shallowRef<AxiosError | null>(null)
    const isLoading = ref<boolean>(false)

    // AbortController to cancel requests
    let abortController: AbortController | null = null

    const execute = async (...args: unknown[]) => {
        // Cancel previous request if it exists
        if (abortController) {
            abortController.abort()
        }

        const ctl = new AbortController()
        abortController = ctl
        isLoading.value = true
        error.value = null

        try {
            // Pass signal as the FIRST argument
            const response = await serviceFn(ctl.signal, ...args)
            // A newer call (or abort) owns the state now; this answer is stale.
            if (abortController !== ctl) return
            if (transform) {
                data.value = transform(response.data as T)
            } else {
                data.value = response.data as unknown as R
            }
        } catch (err) {
            if (abortController !== ctl) return
            if (axios.isCancel(err)) {
                console.log('Request canceled')
            } else {
                error.value = err as AxiosError
            }
        } finally {
            if (abortController === ctl) {
                isLoading.value = false
                abortController = null
            }
        }
    }

    const abort = () => {
        if (abortController) {
            abortController.abort()
            abortController = null
            isLoading.value = false
        }
    }

    onMounted(() => {
        if (immediate) {
            if (params !== undefined) {
                const initialArgs = Array.isArray(params) ? params : [params]
                execute(...initialArgs)
            } else {
                execute()
            }
        }
    })

    onUnmounted(() => {
        abort()
    })

    return {
        data,
        error,
        isLoading,
        execute,
        abort,
    }
}
