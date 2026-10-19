// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import TestCaseManager from '../TestCaseManager.vue'
import { useToast } from '@/composables/useToast'
import type { TestCaseSummary } from '@/types/testCase'
import { fullResponseFixture, summaryFixture } from '@/services/__tests__/testCaseFixtures'

const svc = vi.hoisted(() => ({
    getTestCases: vi.fn(),
    getTestCase: vi.fn(),
    addTestCase: vi.fn(),
    updateTestCase: vi.fn(),
    setSample: vi.fn(),
    importTestCases: vi.fn(),
    remove: vi.fn(),
}))
vi.mock('@/services/testCaseService', () => ({ default: svc }))

const tc = (id: string, sample = false): TestCaseSummary => ({
    id, name: id, sample, inputSize: 3, outputSize: 1, inputPreview: '1 2', outputPreview: '3',
})

let wrapper: VueWrapper | undefined

async function mountManager(rows: TestCaseSummary[]) {
    svc.getTestCases.mockResolvedValue({ data: { data: rows } })
    wrapper = mount(TestCaseManager, { attachTo: document.body, props: { slug: 'sum', canManage: true } })
    await flushPromises()
    return wrapper
}

const toggle = (name: string) =>
    document.body.querySelector(`[role="switch"][aria-label="Open test case ${name}"]`) as HTMLElement
const button = (text: string) =>
    [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement

beforeEach(() => {
    Object.values(svc).forEach((m) => m.mockReset())
})
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})

describe('TestCaseManager', () => {
    it('summaryCounts', async () => {
        await mountManager([tc('01', true), tc('02'), tc('03')])
        expect(document.body.textContent).toContain('3 tests · 1 sample')
    })

    it('hiddenToOpenAsksFirst', async () => {
        await mountManager([tc('01'), tc('02')])
        toggle('01').click()
        await nextTick()
        expect(document.body.textContent).toContain('Make test case 01 open?')
        expect(svc.setSample).not.toHaveBeenCalled()
        svc.setSample.mockResolvedValue({ data: { data: tc('01', true) } })
        button('Make open').click()
        await flushPromises()
        expect(svc.setSample).toHaveBeenCalledWith('sum', '01', true)
        expect(document.body.textContent).toContain('2 tests · 1 sample')
    })

    it('openToHiddenAppliesImmediately', async () => {
        await mountManager([tc('01', true)])
        svc.setSample.mockResolvedValue({ data: { data: tc('01', false) } })
        toggle('01').click()
        await flushPromises()
        expect(document.body.textContent).not.toContain('Make test case')
        expect(svc.setSample).toHaveBeenCalledWith('sum', '01', false)
        expect(document.body.textContent).toContain('1 test · 0 sample')
    })

    it.each([
        ['a TestCaseSummary', () => summaryFixture({ id: '01', name: '01', sample: false })],
        ['a full TestCaseResponse', () => fullResponseFixture({ id: '01', name: '01', sample: false })],
        ['an empty body', () => undefined],
    ])('toggleKeepsTheRowRenderedWhenTheResponseIs %s', async (_label, body) => {
        await mountManager([tc('01', true)])
        svc.setSample.mockResolvedValue({ data: { data: body() } })
        toggle('01').click()
        await flushPromises()
        expect(document.body.textContent).toContain('1 test · 0 sample')
        expect(document.body.textContent).toContain('Hidden')
        expect(document.body.textContent).toContain('1 2')
        expect(document.body.textContent).toContain('3 B')
    })

    it('switchRevertsOnError', async () => {
        await mountManager([tc('01', true)])
        svc.setSample.mockRejectedValue(new Error('boom'))
        toggle('01').click()
        await flushPromises()
        expect(toggle('01').getAttribute('aria-checked')).toBe('true')
        expect(toggle('01').hasAttribute('disabled')).toBe(false)
        expect(useToast().toasts.value.some((t) => t.type === 'error')).toBe(true)
    })
})
