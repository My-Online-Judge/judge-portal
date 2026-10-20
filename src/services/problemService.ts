import axiosClient, { API_BASE_URL } from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { Problem, ProblemSearchParams, TagCount, CheckerInfo, CreateProblemPayload, UpdateProblemPayload } from '@/types/problem'
import { API_ROUTES } from '@/constants/apiPath'

// Builds the multipart body for problem creation:
// part "data" = JSON dto, part "file" = test-case archive
export function buildProblemFormData(dto: CreateProblemPayload, file: File): FormData {
    const fd = new FormData()
    fd.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }))
    fd.append('file', file)
    return fd
}

// Packages go up to 50 MB: the client's default 10 s is too short for the upload.
const PACKAGE_TIMEOUT_MS = 120_000

class ProblemService {

    // Get all problems with pagination and search params
    // Signal is first to support simple useFetch usage
    getProblems(signal?: AbortSignal, params?: ProblemSearchParams): Promise<AxiosResponse<ApiResponse<Problem[]>>> {
        return axiosClient.get<ApiResponse<Problem[]>>(API_ROUTES.PROBLEMS.ROOT, {
            params,
            signal
        })
    }

    // Tag vocabulary with counts (public)
    getTags(signal?: AbortSignal): Promise<AxiosResponse<ApiResponse<TagCount[]>>> {
        return axiosClient.get<ApiResponse<TagCount[]>>(API_ROUTES.PROBLEMS.TAGS, { signal })
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

    // The problem's checker with its source (problem:update)
    getChecker(slug: string): Promise<AxiosResponse<ApiResponse<CheckerInfo>>> {
        return axiosClient.get<ApiResponse<CheckerInfo>>(API_ROUTES.PROBLEMS.CHECKER(slug))
    }

    // Upload or replace the checker: multipart part "file", a C++ source of at most 64 KiB
    uploadChecker(slug: string, file: File): Promise<AxiosResponse<ApiResponse<CheckerInfo>>> {
        const fd = new FormData()
        fd.append('file', file)
        return axiosClient.put<ApiResponse<CheckerInfo>>(API_ROUTES.PROBLEMS.CHECKER(slug), fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    }

    // Remove the checker: outputs are compared again (the source file is kept server-side)
    removeChecker(slug: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.delete<ApiResponse<void>>(API_ROUTES.PROBLEMS.CHECKER(slug))
    }

    // Create a problem from an exported package (zip). A blank override is not sent; the package's slug is used.
    // Aborting `signal` cancels the upload.
    importPackage(file: File, slugOverride?: string, signal?: AbortSignal): Promise<AxiosResponse<ApiResponse<Problem>>> {
        const fd = new FormData()
        fd.append('file', file)
        if (slugOverride?.trim()) fd.append('slugOverride', slugOverride.trim())
        return axiosClient.post<ApiResponse<Problem>>(API_ROUTES.PROBLEMS.IMPORT, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: PACKAGE_TIMEOUT_MS,
            signal,
        })
    }

    // Where a problem's package (zip) downloads from. Open it as a link (lib/download downloadUrl): the zip streams to
    // disk with the session cookie. A link skips the client's refresh-on-401, so make the session fresh first.
    exportUrl(slug: string): string {
        return API_BASE_URL + API_ROUTES.PROBLEMS.EXPORT(slug)
    }

    // Same delete for page unload: fetch with keepalive survives the tab closing (axios/XHR does not).
    deleteKeepalive(slug: string): void {
        void fetch(API_BASE_URL + API_ROUTES.PROBLEMS.DETAIL(slug), {
            method: 'DELETE',
            credentials: 'include',
            keepalive: true,
        }).catch(() => undefined)
    }
}

export default new ProblemService()
