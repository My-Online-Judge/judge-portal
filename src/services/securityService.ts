import axiosClient, { API_BASE_URL } from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { LoginAttempt, AccessBan, AttemptListParams, CreateBanPayload } from '@/types/security'
import { API_ROUTES } from '@/constants/apiPath'

class SecurityService {
    // Paged, filtered login-attempt log. Signal is first for simple useFetch usage.
    listAttempts(signal?: AbortSignal, params?: AttemptListParams): Promise<AxiosResponse<ApiResponse<LoginAttempt[]>>> {
        return axiosClient.get<ApiResponse<LoginAttempt[]>>(API_ROUTES.SECURITY.ATTEMPTS, { params, signal })
    }

    listBans(
        signal?: AbortSignal,
        params?: { page?: number; size?: number },
    ): Promise<AxiosResponse<ApiResponse<AccessBan[]>>> {
        return axiosClient.get<ApiResponse<AccessBan[]>>(API_ROUTES.SECURITY.BANS, { params, signal })
    }

    createBan(payload: CreateBanPayload): Promise<AxiosResponse<ApiResponse<AccessBan>>> {
        return axiosClient.post<ApiResponse<AccessBan>>(API_ROUTES.SECURITY.BANS, payload)
    }

    deleteBan(id: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.delete<ApiResponse<void>>(API_ROUTES.SECURITY.BAN(id))
    }

    // Same delete for page unload: fetch with keepalive survives the tab closing (axios/XHR does not).
    // No body, so no Content-Type (as with the axios call), which also avoids a CORS preflight.
    deleteBanKeepalive(id: string): void {
        void fetch(API_BASE_URL + API_ROUTES.SECURITY.BAN(id), {
            method: 'DELETE',
            credentials: 'include',
            keepalive: true,
        }).catch(() => undefined)
    }
}

export default new SecurityService()
