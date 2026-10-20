import axiosClient, { refreshSession } from '@/api/axiosClient'
import { markSessionFresh } from '@/api/refreshSession'
import { API_ROUTES } from '@/constants/apiPath'
import type { GoogleAuthResponse } from '@/types/auth'
import type { ApiResponse } from '@/types/common'

import type { UserResponse } from '@/types/user'

class AuthService {
    /** Username + password login (admin accounts). The API sets HttpOnly session cookies. */
    async login(username: string, password: string) {
        const response = await axiosClient.post<ApiResponse<void>>(API_ROUTES.AUTH.LOGIN, { username, password })
        markSessionFresh()
        return response
    }

    /** Returns the Google login URL. The API handles the callback and sets the session cookies. */
    async getGoogleAuthUrl() {
        return axiosClient.get<ApiResponse<GoogleAuthResponse>>(API_ROUTES.AUTH.GOOGLE_URL)
    }

    /**
     * Exchange the HttpOnly refresh cookie for a new access token. The API re-sets the cookie. This is the tab's
     * shared refresh (one flight with the 401 interceptor and the verdict stream), never a POST of its own.
     */
    refresh() {
        return refreshSession()
    }

    async getMe() {
        return axiosClient.get<ApiResponse<UserResponse>>(API_ROUTES.AUTH.ME)
    }

    async logout() {
        return axiosClient.post<ApiResponse<void>>(API_ROUTES.AUTH.LOGOUT)
    }
}

export default new AuthService()
