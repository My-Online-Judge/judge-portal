import axiosClient from '@/api/axiosClient'
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
}

export default new SecurityService()
