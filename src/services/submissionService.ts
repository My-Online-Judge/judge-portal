import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import { API_ROUTES } from '@/constants/apiPath'
import type { UserStats } from '@/types/profile'
import type {
    RunRequest,
    RunResponse,
    Submission,
    SubmissionListItem,
    SubmissionRequest,
    SubmissionSearchParams,
} from '@/types/submission'

// A run waits for the sandboxes: above the server's 45 s wait, well above the client's 10 s default.
const RUN_TIMEOUT_MS = 60_000

class SubmissionService {
    submit(req: SubmissionRequest): Promise<AxiosResponse<ApiResponse<Submission>>> {
        return axiosClient.post<ApiResponse<Submission>>(API_ROUTES.SUBMISSIONS.ROOT, req)
    }

    // Judges the code against the given cases and answers when they are done. Nothing is stored and nothing counts.
    // The server holds the request open for up to 45 s (then 504): longer than the client's 10 s default.
    run(req: RunRequest): Promise<AxiosResponse<ApiResponse<RunResponse>>> {
        return axiosClient.post<ApiResponse<RunResponse>>(API_ROUTES.SUBMISSIONS.RUN, req, { timeout: RUN_TIMEOUT_MS })
    }

    // Every submission, newest first (submission:read_any). Undefined filters are left out.
    search(signal: AbortSignal, params: SubmissionSearchParams): Promise<AxiosResponse<ApiResponse<SubmissionListItem[]>>> {
        return axiosClient.get(API_ROUTES.SUBMISSIONS.ROOT, { params, signal })
    }

    // Public per-user statistics; the server hides non-visible problem slugs from non-owners.
    getUserStats(userId: string): Promise<AxiosResponse<ApiResponse<UserStats>>> {
        return axiosClient.get(API_ROUTES.USERS.STATS(userId))
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
