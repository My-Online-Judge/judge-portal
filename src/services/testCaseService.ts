import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { TestCase } from '@/types/testCase'
import { API_ROUTES } from '@/constants/apiPath'

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

class TestCaseService {

    // List a problem's test cases. Signal is first to support simple useFetch usage.
    getTestCases(signal: AbortSignal, slug: string): Promise<AxiosResponse<ApiResponse<TestCase[]>>> {
        return axiosClient.get<ApiResponse<TestCase[]>>(API_ROUTES.PROBLEMS.TEST_CASES(slug), { signal })
    }

    // Add one test case: multipart parts "input" + "output" (both files).
    addTestCase(slug: string, input: File, output: File): Promise<AxiosResponse<ApiResponse<TestCase>>> {
        const fd = new FormData()
        fd.append('input', input)
        fd.append('output', output)
        return axiosClient.post<ApiResponse<TestCase>>(API_ROUTES.PROBLEMS.TEST_CASES(slug), fd, MULTIPART)
    }

    // Bulk import from a zip: multipart part "file" → returns the added cases.
    importTestCases(slug: string, zip: File): Promise<AxiosResponse<ApiResponse<TestCase[]>>> {
        const fd = new FormData()
        fd.append('file', zip)
        return axiosClient.post<ApiResponse<TestCase[]>>(API_ROUTES.PROBLEMS.TEST_CASES_IMPORT(slug), fd, MULTIPART)
    }

    // Delete a single test case by id.
    remove(slug: string, id: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.delete<ApiResponse<void>>(API_ROUTES.PROBLEMS.TEST_CASE(slug, id))
    }
}

export default new TestCaseService()
