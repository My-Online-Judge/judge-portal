
import axios, { type AxiosError, type AxiosResponse } from 'axios'
import { getDeviceId } from '@/lib/deviceId'

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

// Response Interceptor
axiosClient.interceptors.response.use(
    (response: AxiosResponse) => {
        return response
    },
    (error: AxiosError) => {
        // Handle global errors
        if (error.response) {
            const status = error.response.status
            if (status === 401) {
                console.warn('Unauthorized access. Redirecting to login...')
                // window.location.href = '/login'
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
