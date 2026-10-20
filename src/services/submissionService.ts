import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import { API_ROUTES } from '@/constants/apiPath'
import type { Submission, SubmissionListItem, SubmissionRequest, SubmissionSearchParams } from '@/types/submission'

class SubmissionService {
    submit(req: SubmissionRequest): Promise<AxiosResponse<ApiResponse<Submission>>> {
        return axiosClient.post<ApiResponse<Submission>>(API_ROUTES.SUBMISSIONS.ROOT, req)
    }

    // Every submission, newest first (submission:read_any). Undefined filters are left out.
    search(signal: AbortSignal, params: SubmissionSearchParams): Promise<AxiosResponse<ApiResponse<SubmissionListItem[]>>> {
        return axiosClient.get(API_ROUTES.SUBMISSIONS.ROOT, { params, signal })
    }

    getSubmissionById(id: string): Promise<AxiosResponse<ApiResponse<Submission>>> {
        return axiosClient.get(API_ROUTES.SUBMISSIONS.DETAIL(id))
    }

    rejudge(id: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.post(API_ROUTES.SUBMISSIONS.REJUDGE(id))
    }

    rejudgeProblem(slug: string, status?: number): Promise<AxiosResponse<ApiResponse<{ queued: number }>>> {
        return axiosClient.post(API_ROUTES.PROBLEMS.REJUDGE(slug), null, { params: status === undefined ? undefined : { status } })
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
