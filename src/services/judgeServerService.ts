import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { JudgeServer } from '@/types/judgeServer'
import { API_ROUTES } from '@/constants/apiPath'

class JudgeServerService {

    // List the registered judge servers (plain list, not paged).
    // Signal is first to support simple useFetch usage.
    getJudgeServers(signal?: AbortSignal): Promise<AxiosResponse<ApiResponse<JudgeServer[]>>> {
        return axiosClient.get<ApiResponse<JudgeServer[]>>(API_ROUTES.JUDGE_SERVERS.ROOT, { signal })
    }
}

export default new JudgeServerService()
