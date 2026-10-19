// Response bodies copied from the oj-problem-service DTOs (TestCaseSummary record, TestCaseResponse class).
import type { TestCase, TestCaseSummary } from '@/types/testCase'

export const summaryFixture = (over: Partial<TestCaseSummary> = {}): TestCaseSummary => ({
    id: '3f2b8c1e-0000-4000-8000-000000000001',
    name: '1',
    sample: true,
    inputSize: 4,
    outputSize: 2,
    inputPreview: '1 2\n',
    outputPreview: '3\n',
    ...over,
})

export const fullResponseFixture = (over: Partial<TestCase> = {}): TestCase => ({
    id: '3f2b8c1e-0000-4000-8000-000000000001',
    name: '1',
    sample: true,
    input: '1 2\n',
    output: '3\n',
    ...over,
})
