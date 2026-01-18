
import axios, { type InternalAxiosRequestConfig, type AxiosError, type AxiosResponse } from 'axios'

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
})

// Request Interceptor
axiosClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`
            const parts = value.split(`; ${name}=`)
            if (parts.length === 2) return parts.pop()?.split(';').shift()
        }

        const accessToken = getCookie('accessToken')
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
        }
        return config
    },
    (error: AxiosError) => {
        return Promise.reject(error)
    }
)

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
