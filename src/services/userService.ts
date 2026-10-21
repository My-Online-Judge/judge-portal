import axiosClient, { API_BASE_URL } from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { UserResponse, UserListParams, CreateUserPayload, UpdateUserPayload } from '@/types/user'
import type { PublicProfile } from '@/types/profile'
import { API_ROUTES } from '@/constants/apiPath'

class UserService {
    // Paged, filtered user list. Signal is first for simple useFetch usage.
    list(signal?: AbortSignal, params?: UserListParams): Promise<AxiosResponse<ApiResponse<UserResponse[]>>> {
        return axiosClient.get<ApiResponse<UserResponse[]>>(API_ROUTES.USERS.ROOT, { params, signal })
    }

    get(signal: AbortSignal, id: string): Promise<AxiosResponse<ApiResponse<UserResponse>>> {
        return axiosClient.get<ApiResponse<UserResponse>>(API_ROUTES.USERS.PROFILE(id), { signal })
    }

    // Anyone may read this; deleted accounts are 404.
    getPublicProfile(username: string): Promise<AxiosResponse<ApiResponse<PublicProfile>>> {
        return axiosClient.get<ApiResponse<PublicProfile>>(API_ROUTES.USERS.PUBLIC(username))
    }

    // Anyone may read these (1 to 100 ids); unknown and deleted accounts are left out.
    getPublicProfilesByIds(ids: string[]): Promise<AxiosResponse<ApiResponse<PublicProfile[]>>> {
        return axiosClient.get<ApiResponse<PublicProfile[]>>(API_ROUTES.USERS.PUBLIC_BY_IDS, { params: { ids: ids.join(',') } })
    }

    // Create a local account (username + password). Returns the created user.
    create(payload: CreateUserPayload): Promise<AxiosResponse<ApiResponse<UserResponse>>> {
        return axiosClient.post<ApiResponse<UserResponse>>(API_ROUTES.USERS.ROOT, payload)
    }

    // Update profile (name/email/status). username is immutable.
    update(id: string, payload: UpdateUserPayload): Promise<AxiosResponse<ApiResponse<UserResponse>>> {
        return axiosClient.put<ApiResponse<UserResponse>>(API_ROUTES.USERS.PROFILE(id), payload)
    }

    // Enable/disable only (ACTIVE/DISABLED); soft-delete goes through remove().
    updateStatus(id: string, status: number): Promise<AxiosResponse<ApiResponse<UserResponse>>> {
        return axiosClient.patch<ApiResponse<UserResponse>>(API_ROUTES.USERS.STATUS(id), { status })
    }

    // Same status change for page unload: fetch with keepalive survives the tab closing (axios/XHR does not).
    updateStatusKeepalive(id: string, status: number): void {
        void fetch(API_BASE_URL + API_ROUTES.USERS.STATUS(id), {
            method: 'PATCH',
            credentials: 'include',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        }).catch(() => undefined)
    }

    // Replace the user's whole role set. The server rejects SYS_ROOT (409).
    updateRoles(id: string, roleIds: string[]): Promise<AxiosResponse<ApiResponse<UserResponse>>> {
        return axiosClient.put<ApiResponse<UserResponse>>(API_ROUTES.USERS.ROLES(id), { roleIds })
    }

    resetPassword(id: string, newPassword: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.post<ApiResponse<void>>(API_ROUTES.USERS.RESET_PASSWORD(id), { newPassword })
    }

    // Change the signed-in user's own password. On success the server clears both
    // auth cookies, so the caller must treat the session as ended.
    async changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
        await axiosClient.put<ApiResponse<void>>(API_ROUTES.USERS.ME_PASSWORD, { currentPassword, newPassword })
    }

    // Soft-delete (status -> DELETED). Server keeps the record + submissions.
    remove(id: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.delete<ApiResponse<void>>(API_ROUTES.USERS.PROFILE(id))
    }
}

export default new UserService()
