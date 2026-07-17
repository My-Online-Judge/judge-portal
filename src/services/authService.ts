import axiosClient from '@/api/axiosClient'
import { API_ROUTES } from '@/constants/apiPath'
import type { GoogleAuthResponse } from '@/types/auth'
import type { ApiResponse } from '@/types/common'

import type { UserResponse } from '@/types/user'

class AuthService {
    /** Username + password login (admin accounts). The API sets HttpOnly session cookies. */
    async login(username: string, password: string) {
        return axiosClient.post<ApiResponse<void>>(API_ROUTES.AUTH.LOGIN, { username, password })
    }

    /** Returns the Google login URL. The API handles the callback and sets the session cookies. */
    async getGoogleAuthUrl() {
        return axiosClient.get<ApiResponse<GoogleAuthResponse>>(API_ROUTES.AUTH.GOOGLE_URL)
    }

    async getMe() {
        return axiosClient.get<ApiResponse<UserResponse>>(API_ROUTES.AUTH.ME)
    }

    async logout() {
        return axiosClient.post<ApiResponse<void>>(API_ROUTES.AUTH.LOGOUT)
    }
}

export default new AuthService()
