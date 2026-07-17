import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { Permission } from '@/types/permission'
import { API_ROUTES } from '@/constants/apiPath'

class PermissionService {

    // List the full, seeded permission catalog (plain list, not paged).
    // Signal is first to support simple useFetch usage.
    getPermissions(signal?: AbortSignal): Promise<AxiosResponse<ApiResponse<Permission[]>>> {
        return axiosClient.get<ApiResponse<Permission[]>>(API_ROUTES.PERMISSIONS.ROOT, { signal })
    }
}

export default new PermissionService()
