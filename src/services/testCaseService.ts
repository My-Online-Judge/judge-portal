import axiosClient from '@/api/axiosClient'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types/common'
import type { TestCase, TestCaseSummary } from '@/types/testCase'
import { API_ROUTES } from '@/constants/apiPath'

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

function inOutForm(input: Blob, output: Blob): FormData {
    const fd = new FormData()
    // Explicit filenames: Spring only treats a part as a file when it has one.
    fd.append('input', input, input instanceof File ? input.name : 'case.in')
    fd.append('output', output, output instanceof File ? output.name : 'case.out')
    return fd
}

class TestCaseService {

    // List a problem's test cases (metadata + previews). Signal is first to support simple useFetch usage.
    getTestCases(signal: AbortSignal, slug: string): Promise<AxiosResponse<ApiResponse<TestCaseSummary[]>>> {
        return axiosClient.get<ApiResponse<TestCaseSummary[]>>(API_ROUTES.PROBLEMS.TEST_CASES(slug), { signal })
    }

    // One test case with its full input and output.
    getTestCase(slug: string, id: string): Promise<AxiosResponse<ApiResponse<TestCase>>> {
        return axiosClient.get<ApiResponse<TestCase>>(API_ROUTES.PROBLEMS.TEST_CASE(slug, id))
    }

    // Add one test case: multipart parts "input" + "output" (both files).
    addTestCase(slug: string, input: Blob, output: Blob): Promise<AxiosResponse<ApiResponse<TestCaseSummary>>> {
        return axiosClient.post<ApiResponse<TestCaseSummary>>(
            API_ROUTES.PROBLEMS.TEST_CASES(slug), inOutForm(input, output), MULTIPART)
    }

    // Replace a test case's content: multipart PUT, parts "input" + "output".
    updateTestCase(slug: string, id: string, input: Blob, output: Blob): Promise<AxiosResponse<ApiResponse<TestCaseSummary>>> {
        return axiosClient.put<ApiResponse<TestCaseSummary>>(
            API_ROUTES.PROBLEMS.TEST_CASE(slug, id), inOutForm(input, output), MULTIPART)
    }

    // Flip a test case between open (sample) and hidden.
    setSample(slug: string, id: string, sample: boolean): Promise<AxiosResponse<ApiResponse<TestCaseSummary>>> {
        return axiosClient.patch<ApiResponse<TestCaseSummary>>(API_ROUTES.PROBLEMS.TEST_CASE(slug, id), { sample })
    }

    // Bulk import from a zip: multipart part "file" → returns the added cases.
    importTestCases(slug: string, zip: File): Promise<AxiosResponse<ApiResponse<TestCaseSummary[]>>> {
        const fd = new FormData()
        fd.append('file', zip)
        return axiosClient.post<ApiResponse<TestCaseSummary[]>>(API_ROUTES.PROBLEMS.TEST_CASES_IMPORT(slug), fd, MULTIPART)
    }

    // Delete a single test case by id.
    remove(slug: string, id: string): Promise<AxiosResponse<ApiResponse<void>>> {
        return axiosClient.delete<ApiResponse<void>>(API_ROUTES.PROBLEMS.TEST_CASE(slug, id))
    }
}

export default new TestCaseService()
