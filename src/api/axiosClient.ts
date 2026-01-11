
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
        // Token is handled via HttpOnly cookie automatically by the browser
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
