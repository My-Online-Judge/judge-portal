import { ref, onMounted, onUnmounted, shallowRef, type Ref } from 'vue'
import axios, { type AxiosResponse, type AxiosError } from 'axios'

interface UseFetchOptions<T, R = T> {
    immediate?: boolean
    params?: any // Can be array of args or single arg
    transform?: (data: T) => R
}

interface UseFetchState<R> {
    data: Ref<R | null>
    error: Ref<AxiosError | null>
    isLoading: Ref<boolean>
    execute: (...args: any[]) => Promise<void>
    abort: () => void
}

/**
 * useFetch expects a service function where the FIRST argument is AbortSignal.
 * This allows for optional trailing arguments in the service function.
 * 
 * Example: serviceFn(signal, param1, param2)
 */
export function useFetch<T = any, R = T>(
    serviceFn: (signal: AbortSignal, ...args: any[]) => Promise<AxiosResponse<T>>,
    options: UseFetchOptions<T, R> = {}
): UseFetchState<R> {
    const { immediate = true, params, transform } = options

    const data = shallowRef<R | null>(null)
    const error = shallowRef<AxiosError | null>(null)
    const isLoading = ref<boolean>(false)

    // AbortController to cancel requests
    let abortController: AbortController | null = null

    const execute = async (...args: any[]) => {
        // Cancel previous request if it exists
        if (abortController) {
            abortController.abort()
        }

        abortController = new AbortController()
        isLoading.value = true
        error.value = null

        try {
            // Pass signal as the FIRST argument
            const response = await serviceFn(abortController.signal, ...args)
            if (transform) {
                // @ts-ignore
                data.value = transform(response.data as T)
            } else {
                data.value = response.data as unknown as R
            }
        } catch (err: any) {
            if (axios.isCancel(err)) {
                console.log('Request canceled', err.message)
            } else {
                error.value = err as AxiosError
            }
        } finally {
            isLoading.value = false
            abortController = null
        }
    }

    const abort = () => {
        if (abortController) {
            abortController.abort()
            abortController = null
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
