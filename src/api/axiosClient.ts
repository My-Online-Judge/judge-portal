
import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { getDeviceId } from '@/lib/deviceId'
import { API_ROUTES } from '@/constants/apiPath'
import { createRefreshOn401 } from './refreshSession'

// Auth rides on the HttpOnly accessToken cookie the API sets during the Google
// callback. JS cannot read it (that is the point), so there is no token to attach
// by hand — withCredentials sends it and the API reads it off the cookie.
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
})

// Tag every request with a stable device id so the API can record login/token origin.
axiosClient.interceptors.request.use((config) => {
    config.headers['X-Device-Id'] = getDeviceId()
    return config
})

// An expired access token comes back as 401 (403 means "authenticated but not
// permitted" and must never be retried). Refresh once, then replay the request.
const handleUnauthorized = createRefreshOn401({
    refresh: () => axiosClient.post(API_ROUTES.AUTH.REFRESH_TOKEN),
    retry: (config) => axiosClient.request(config),
    onGiveUp: async () => {
        // Imported lazily: the store imports authService, which imports this module.
        const { useAuthStore } = await import('@/stores/auth')
        // Clear local state only. No navigation — the router guard sends the user to
        // /admin/login if they touch a gated route, and a public visitor stays put.
        await useAuthStore().logout({ reload: false, notifyServer: false })
    },
})

// Response Interceptor
axiosClient.interceptors.response.use(
    (response: AxiosResponse) => {
        return response
    },
    (error: AxiosError) => {
        if (error.response) {
            const status = error.response.status
            if (status === 401) {
                return handleUnauthorized(error)
            } else if (status === 404) {
                console.warn('Resource not found.')
            } else if (status >= 500) {
                console.error('Server error occurred.')
            }
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }
        return Promise.reject(error)
    }
)

export default axiosClient
