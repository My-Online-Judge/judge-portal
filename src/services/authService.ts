import axiosClient from '@/api/axiosClient'
import { API_ROUTES } from '@/constants/apiPath'
import type { AuthResponse, GoogleAuthResponse, LoginRequest, RegisterRequest } from '@/types/auth'
import type { ApiResponse } from '@/types/common'

import type { UserResponse } from '@/types/user'

class AuthService {
    async getGoogleAuthUrl() {
        return axiosClient.get<ApiResponse<GoogleAuthResponse>>(API_ROUTES.AUTH.GOOGLE_URL)
    }

    async authenticateGoogleUser(code: string) {
        return axiosClient.post<ApiResponse<AuthResponse>>(API_ROUTES.AUTH.GOOGLE_AUTH, { code })
    }

    async getMe() {
        return axiosClient.get<ApiResponse<UserResponse>>(API_ROUTES.AUTH.ME)
    }

    async logout() {
        return axiosClient.post<ApiResponse<void>>(API_ROUTES.AUTH.LOGOUT)
    }
}

export default new AuthService()
