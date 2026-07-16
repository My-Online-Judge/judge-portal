import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { Problem, ProblemSearchParams, CreateProblemPayload, UpdateProblemPayload } from '@/types/problem'
import { API_ROUTES } from '@/constants/apiPath'

// Builds the multipart body for problem creation:
// part "data" = JSON dto, part "file" = test-case archive
export function buildProblemFormData(dto: CreateProblemPayload, file: File): FormData {
    const fd = new FormData()
    fd.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }))
    fd.append('file', file)
    return fd
}

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

    // Create a problem: multipart body built via buildProblemFormData (parts "data" + "file")
    create(body: FormData): Promise<AxiosResponse<ApiResponse<Problem>>> {
        return axiosClient.post<ApiResponse<Problem>>(API_ROUTES.PROBLEMS.ROOT, body, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    }

    // Update a problem by slug (JSON body, no test-case re-upload)
    update(slug: string, dto: UpdateProblemPayload): Promise<AxiosResponse<ApiResponse<Problem>>> {
        return axiosClient.put<ApiResponse<Problem>>(API_ROUTES.PROBLEMS.DETAIL(slug), dto)
    }

    // Delete a problem by slug
    remove(slug: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.delete<ApiResponse<void>>(API_ROUTES.PROBLEMS.DETAIL(slug))
    }
}

export default new ProblemService()
