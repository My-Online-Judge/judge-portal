import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { Role } from '@/types/role'
import { API_ROUTES } from '@/constants/apiPath'

class RoleService {

    // List all roles with their permission names (plain list, not paged).
    // Signal is first to support simple useFetch usage.
    getRoles(signal?: AbortSignal): Promise<AxiosResponse<ApiResponse<Role[]>>> {
        return axiosClient.get<ApiResponse<Role[]>>(API_ROUTES.ROLES.ROOT, { signal })
    }

    // Replace a role's whole permission set (replace-all PUT, idempotent).
    // `permissions` are permission names; returns the updated role.
    updatePermissions(id: string, permissions: string[]): Promise<AxiosResponse<ApiResponse<Role>>> {
        return axiosClient.put<ApiResponse<Role>>(API_ROUTES.ROLES.PERMISSIONS(id), { permissions })
    }
}

export default new RoleService()
