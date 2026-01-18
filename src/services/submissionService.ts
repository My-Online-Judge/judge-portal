import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import { API_ROUTES } from '@/constants/apiPath'
import type { Submission, SubmissionRequest } from '@/types/submission'

class SubmissionService {
    submit(req: SubmissionRequest): Promise<AxiosResponse<ApiResponse<Submission>>> {
        return axiosClient.post<ApiResponse<Submission>>(API_ROUTES.SUBMISSIONS.ROOT, req)
    }

    getSubmissionsByUserAndProblem(
        signal: AbortSignal,
        userId: string | number,
        problemSlug: string,
        page = 0,
        size = 10,
    ): Promise<AxiosResponse<ApiResponse<Submission[]>>> {
        return axiosClient.get(API_ROUTES.SUBMISSIONS.BY_USER_PROBLEM(userId, problemSlug), {
            params: { page, size },
            signal,
        })
    }
}

export default new SubmissionService()
