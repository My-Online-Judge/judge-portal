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

    // Create a new role (starts with no permissions). `name` must be UPPER_SNAKE
    // and unique; returns the created role.
    create(payload: { name: string; description?: string }): Promise<AxiosResponse<ApiResponse<Role>>> {
        return axiosClient.post<ApiResponse<Role>>(API_ROUTES.ROLES.ROOT, payload)
    }

    // Replace a role's whole permission set (replace-all PUT, idempotent).
    // `permissions` are permission names; returns the updated role.
    updatePermissions(id: string, permissions: string[]): Promise<AxiosResponse<ApiResponse<Role>>> {
        return axiosClient.put<ApiResponse<Role>>(API_ROUTES.ROLES.PERMISSIONS(id), { permissions })
    }

    // Delete a role. The server refuses system roles (ADMIN/USER) and roles still
    // held by any user (409).
    remove(id: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.delete<ApiResponse<void>>(API_ROUTES.ROLES.DETAIL(id))
    }
}

export default new RoleService()
