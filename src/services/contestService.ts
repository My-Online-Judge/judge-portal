import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { Problem } from '@/types/problem'
import type { ContestDetail, ContestList, ContestPayload, ContestSummary, Scoreboard } from '@/types/contest'
import { API_ROUTES } from '@/constants/apiPath'

// The signal comes first so that useFetch can call these directly.
class ContestService {
    // Public: published contests by phase (drafts too for contest editors), with the server's clock.
    list(signal?: AbortSignal): Promise<AxiosResponse<ApiResponse<ContestList>>> {
        return axiosClient.get(API_ROUTES.CONTESTS.ROOT, { signal })
    }

    // contest:create, update or delete: every contest, drafts included, newest start first. Needs a valid access token.
    listAll(
        signal: AbortSignal,
        params: { page?: number; size?: number; q?: string },
    ): Promise<AxiosResponse<ApiResponse<ContestSummary[]>>> {
        return axiosClient.get(API_ROUTES.CONTESTS.ALL, { signal, params })
    }

    // Public: a draft is a 404 for anyone but contest editors. myProgress needs a valid access cookie.
    get(signal: AbortSignal, slug: string): Promise<AxiosResponse<ApiResponse<ContestDetail>>> {
        return axiosClient.get(API_ROUTES.CONTESTS.DETAIL(slug), { signal })
    }

    // Signed in only: a 404 before the start, unless the caller edits contests and problems.
    getProblem(signal: AbortSignal, slug: string, label: string): Promise<AxiosResponse<ApiResponse<Problem>>> {
        return axiosClient.get(API_ROUTES.CONTESTS.PROBLEM(slug, label), { signal })
    }

    // Public: labels and rows by rank; before the start the labels come with no rows.
    scoreboard(signal: AbortSignal, slug: string): Promise<AxiosResponse<ApiResponse<Scoreboard>>> {
        return axiosClient.get(API_ROUTES.CONTESTS.SCOREBOARD(slug), { signal })
    }

    // contest:create. A taken slug is a 409.
    create(payload: ContestPayload): Promise<AxiosResponse<ApiResponse<ContestDetail>>> {
        return axiosClient.post(API_ROUTES.CONTESTS.ROOT, payload)
    }

    // contest:update. Once a published contest has started, a change of its start or problems is a 409.
    update(slug: string, payload: ContestPayload): Promise<AxiosResponse<ApiResponse<ContestDetail>>> {
        return axiosClient.put(API_ROUTES.CONTESTS.DETAIL(slug), payload)
    }

    // contest:delete. A published contest that has started is a 409.
    remove(slug: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.delete(API_ROUTES.CONTESTS.DETAIL(slug))
    }
}

export default new ContestService()
