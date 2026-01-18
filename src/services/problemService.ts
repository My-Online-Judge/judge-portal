import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { Problem, ProblemSearchParams } from '@/types/problem'
import { API_ROUTES } from '@/constants/apiPath'

class ProblemService {

    // Get all problems with pagination and search params
    // Signal is first to support simple useFetch usage
    getProblems(signal?: AbortSignal, params?: ProblemSearchParams): Promise<AxiosResponse<ApiResponse<Problem[]>>> {
        return axiosClient.get<ApiResponse<Problem[]>>(API_ROUTES.PROBLEMS.ROOT, {
            params,
            signal
        })
    }

    // Get problem by slug
    getProblemBySlug(signal: AbortSignal, slug: string): Promise<AxiosResponse<ApiResponse<Problem>>> {
        return axiosClient.get<ApiResponse<Problem>>(API_ROUTES.PROBLEMS.DETAIL(slug), { signal })
    }
}

export default new ProblemService()
